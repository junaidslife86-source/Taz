import { format, isValid, parse } from "date-fns";
import type { StatementFormat } from "../../types/finance";

export const DATE_RE =
  /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/;

export const TEXT_MONTH_DATE_RE =
  /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;

export const AMOUNT_RE = /[\(-]?\$?\s*[\d,]+\.\d{2}\)?/g;

export const DECIMAL_AMOUNT_RE = /[\d,]+\.\d{2}/g;

export const SKIP_KEYWORDS = [
  "opening balance",
  "closing balance",
  "balance brought",
  "balance carried",
  "total debits",
  "total credits",
  "statement from",
  "statement to",
  "minimum payment",
  "days in statement",
  "account number",
  "page ",
];

const MONTH_PARSE_FORMATS = [
  "d MMM yy",
  "d MMM yyyy",
  "d MMMM yy",
  "d MMMM yyyy",
  "dd/MM/yy",
  "dd/MM/yyyy",
  "d/M/yy",
  "d/M/yyyy",
  "yyyy-MM-dd",
];

const SUSPICIOUS_BALANCE_THRESHOLD = 25_000;
const MAX_PLAUSIBLE_TXN = 50_000;

function parseSlashDate(trimmed: string): string | null {
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!slash) return null;

  const fmt = slash[3]!.length === 2 ? "dd/MM/yy" : "dd/MM/yyyy";
  try {
    const d = parse(trimmed, fmt, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  } catch {
    return null;
  }
  return null;
}

export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const slashIso = parseSlashDate(trimmed);
  if (slashIso) return slashIso;

  for (const fmt of MONTH_PARSE_FORMATS) {
    try {
      const d = parse(trimmed, fmt, new Date());
      if (isValid(d)) return format(d, "yyyy-MM-dd");
    } catch {
      // try next format
    }
  }

  const normalized = trimmed.replace(/\//g, "-");
  const dashParts = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (dashParts) {
    const fmt = dashParts[3]!.length === 2 ? "dd-MM-yy" : "dd-MM-yyyy";
    try {
      const d = parse(normalized, fmt, new Date());
      if (isValid(d)) return format(d, "yyyy-MM-dd");
    } catch {
      // fall through
    }
  }

  for (const fmt of ["yyyy-MM-dd"]) {
    try {
      const d = parse(normalized, fmt, new Date());
      if (isValid(d)) return format(d, "yyyy-MM-dd");
    } catch {
      // try next
    }
  }

  return null;
}

export function parseStatementAmount(raw: string): number | null {
  let text = raw.trim().replace(/\$/g, "").replace(/,/g, "");
  if (!text || text === "-" || text === "—") return null;

  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    text = text.slice(1, -1);
    negative = true;
  }
  if (text.startsWith("-")) {
    text = text.slice(1);
    negative = true;
  }

  const value = parseFloat(text);
  if (isNaN(value)) return null;
  return negative ? -value : value;
}

export function shouldSkipLine(text: string): boolean {
  const lower = text.toLowerCase();
  if (SKIP_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (/\bstatement\s+(from|to)\b/.test(lower)) return true;
  return false;
}

export function signedAmountFromDescription(
  description: string,
  amount: number,
): number {
  const lower = description.toLowerCase();
  if (
    ["deposit", "payment from", "salary", "payroll", "interest received", "credit voucher", "refund"].some(
      (k) => lower.includes(k),
    )
  ) {
    return Math.abs(amount);
  }
  if (
    [
      "withdrawal",
      "debit",
      "payment to",
      "payment by authority",
      "transfer to",
      "tfr ",
      "fee",
      "charge",
      "purchase",
      "osko payment",
    ].some((k) => lower.includes(k))
  ) {
    return -Math.abs(amount);
  }
  return amount;
}

function looksLikeRunningBalancePair(txnAmount: number, balanceAmount: number): boolean {
  if (txnAmount <= 0 || balanceAmount <= 0) return false;
  if (balanceAmount > txnAmount * 2) return true;
  if (balanceAmount >= SUSPICIOUS_BALANCE_THRESHOLD && txnAmount < MAX_PLAUSIBLE_TXN) {
    return true;
  }
  return false;
}

export function pickLineAmount(
  amountStrings: string[],
  description: string,
): number | null {
  if (amountStrings.length === 0) return null;

  const parsed = amountStrings
    .map(parseStatementAmount)
    .filter((v): v is number => v !== null);
  if (parsed.length === 0) return null;

  let txnAmount: number;
  if (parsed.length >= 2) {
    const first = parsed[parsed.length - 2];
    const second = parsed[parsed.length - 1];
    if (looksLikeRunningBalancePair(first, second)) {
      txnAmount = first;
    } else if (looksLikeRunningBalancePair(second, first)) {
      txnAmount = second;
    } else {
      txnAmount = first;
    }
  } else {
    txnAmount = parsed[parsed.length - 1];
  }

  const lower = description.toLowerCase();
  if (
    (lower.includes("opening") || lower.includes("closing")) &&
    lower.includes("balance")
  ) {
    return null;
  }
  if (
    txnAmount >= SUSPICIOUS_BALANCE_THRESHOLD &&
    (lower.includes("deposit") || lower.includes("withdrawal"))
  ) {
    return null;
  }

  return signedAmountFromDescription(description, txnAmount);
}

export function inferAccountName(
  filename: string,
  statementText = "",
  format?: StatementFormat,
): string {
  const pathLower = filename.replace(/\\/g, "/").toLowerCase();
  const text = statementText.toLowerCase().slice(0, 5000);

  if (
    format === "westpac_transaction" ||
    pathLower.startsWith("dc_") ||
    text.includes("westpac choice") ||
    (text.includes("transaction description") && text.includes("debit"))
  ) {
    if (pathLower.includes("joint")) return "Westpac Joint";
    return "Westpac Choice";
  }

  if (pathLower.includes("cc_") || pathLower.includes("credit card")) {
    if (text.includes("altitude") || text.includes("qantas")) {
      return "Westpac Altitude";
    }
    return "Westpac Credit Card";
  }
  if (pathLower.includes("joint")) return "Westpac Joint";
  if (text.includes("westpac")) return "Westpac";
  return "";
}
