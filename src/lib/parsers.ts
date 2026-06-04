import { parseISO, isValid, format } from "date-fns";
import type { ColumnMapping, Transaction } from "../types/finance";

export type ParsedRow = Record<string, string | number | null>;

export type ParseResult = {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
};

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const { parseCsv } = await import("./parsers-csv");
    return parseCsv(file);
  }
  if (ext === "xlsx" || ext === "xls") {
    const { parseXlsx } = await import("./parsers-xlsx");
    return parseXlsx(file);
  }
  throw new Error("Unsupported file type. Please upload a CSV, XLSX, or PDF file.");
}

function parseExcelSerial(trimmed: string): string | null {
  const serial = parseFloat(trimmed);
  if (isNaN(serial) || serial <= 30000 || serial >= 60000) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  if (isValid(date)) return format(date, "yyyy-MM-dd");
  return null;
}

function parseDate(value: string): string | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  const iso = parseISO(trimmed);
  if (isValid(iso)) return format(iso, "yyyy-MM-dd");

  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const pattern of formats) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    let year: number, month: number, day: number;
    if (match[1].length === 4) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    }
    const date = new Date(year, month - 1, day);
    if (isValid(date)) return format(date, "yyyy-MM-dd");
  }

  return parseExcelSerial(trimmed);
}

function parseAmount(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lower = headers.map((h) => h.toLowerCase().trim());

  const find = (...keywords: string[]) => {
    const idx = lower.findIndex((h) =>
      keywords.some((k) => h.includes(k)),
    );
    return idx >= 0 ? headers[idx] : undefined;
  };

  mapping.date = find("date", "transaction date", "posted", "trans date");
  mapping.description = find(
    "description",
    "details",
    "narrative",
    "memo",
    "particulars",
  );
  mapping.debit = find("debit", "withdrawal", "money out");
  mapping.credit = find("credit", "deposit", "money in");
  mapping.amount = find("amount", "value");
  mapping.balance = find("balance", "running balance");
  mapping.accountName = find("account", "account name");

  if (mapping.amount && mapping.balance && mapping.amount === mapping.balance) {
    mapping.amount = undefined;
  }

  return mapping;
}

export function isMappingComplete(mapping: ColumnMapping): boolean {
  if (!mapping.date || !mapping.description) return false;
  return Boolean(mapping.amount || mapping.debit || mapping.credit);
}

export function rowsToTransactions(
  rows: ParsedRow[],
  mapping: ColumnMapping,
  sourceFile: string,
): { transactions: Transaction[]; skipped: number } {
  const transactions: Transaction[] = [];
  let skipped = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const dateCol = mapping.date ? String(row[mapping.date] ?? "") : "";
    const date = parseDate(dateCol);
    if (!date) {
      skipped++;
      continue;
    }

    const description = mapping.description
      ? String(row[mapping.description] ?? "").trim()
      : "";
    if (!description) {
      skipped++;
      continue;
    }

    let amount: number | null = null;
    let type: "income" | "expense" | "transfer" = "expense";

    if (mapping.debit || mapping.credit) {
      const debit = mapping.debit
        ? parseAmount(row[mapping.debit] ?? null)
        : null;
      const credit = mapping.credit
        ? parseAmount(row[mapping.credit] ?? null)
        : null;
      if (credit && credit !== 0) {
        amount = Math.abs(credit);
        type = "income";
      } else if (debit && debit !== 0) {
        amount = -Math.abs(debit);
        type = "expense";
      } else if (mapping.amount) {
        const raw = parseAmount(row[mapping.amount] ?? null);
        if (raw !== null) {
          amount = raw;
          type = raw >= 0 ? "income" : "expense";
        }
      }
    } else if (mapping.amount) {
      const raw = parseAmount(row[mapping.amount] ?? null);
      if (raw === null) {
        skipped++;
        continue;
      }
      amount = raw;
      type = raw >= 0 ? "income" : "expense";
    }

    if (amount === null || amount === 0) {
      skipped++;
      continue;
    }

    const accountName = mapping.accountName
      ? String(row[mapping.accountName] ?? "").trim() || undefined
      : undefined;

    transactions.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount,
      type,
      category: type === "income" ? "Income" : "Other",
      accountName,
      sourceFile,
      importedAt: now,
    });
  }

  return { transactions, skipped };
}
