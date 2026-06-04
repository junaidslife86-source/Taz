import type { DraftTransaction, StatementFormat } from "../../types/finance";
import {
  DATE_RE,
  DECIMAL_AMOUNT_RE,
  TEXT_MONTH_DATE_RE,
  AMOUNT_RE,
  inferAccountName,
  normalizeDate,
  parseStatementAmount,
  pickLineAmount,
  shouldSkipLine,
} from "./common";
import {
  extractStatementSummary,
  reconcileFromTransactions,
  reconcileStatement,
  type ParseStats,
  type ReconciliationKind,
  type ReconciliationResult,
  type StatementSummary,
  sumCredits,
  sumDebits,
} from "./reconciliation";
import {
  parseWestpacCreditCardReducer,
  WESTPAC_CC_AMOUNT_RE,
} from "./westpac-cc-reducer";

const WESTPAC_DC_DATE_START_RE = /^(\d{1,2}\/\d{1,2}\/\d{2})\s+(.*)$/;
export function hasWestpacTransactionTableMarkers(text: string): boolean {
  const lower = text.toLowerCase();
  const hasSlashDateRows = /\d{1,2}\/\d{1,2}\/\d{2}\s+(?:deposit|withdrawal|statement)/i.test(
    lower,
  );
  const hasDebitCreditTable =
    (lower.includes("transaction description") ||
      (lower.includes("debit") && lower.includes("credit") && lower.includes("balance"))) &&
    hasSlashDateRows;
  const hasSummary =
    lower.includes("opening balance") && lower.includes("closing balance");
  return hasDebitCreditTable && hasSummary;
}

export function isWestpacCreditCard(text: string, filename: string): boolean {
  const name = filename.toLowerCase();
  if (name.startsWith("cc_") || name.includes("credit card")) return true;
  const lower = text.toLowerCase();
  if (hasWestpacTransactionTableMarkers(text)) return false;
  if (isWestpacTransactionAccount(text, filename)) return false;
  return (
    lower.includes("westpac") &&
    (lower.includes("mastercard") ||
      lower.includes("altitude qantas") ||
      lower.includes("date of transaction"))
  );
}

export function isWestpacTransactionAccount(text: string, filename: string): boolean {
  const name = filename.toLowerCase();
  if (name.startsWith("cc_") || name.includes("credit card")) return false;
  const lower = text.toLowerCase();
  if (!lower.includes("westpac")) return false;
  if (
    lower.includes("mastercard") &&
    lower.includes("date of transaction") &&
    !hasWestpacTransactionTableMarkers(text)
  ) {
    return false;
  }
  if (hasWestpacTransactionTableMarkers(text)) return true;

  const hasSlashTxn = /\d{1,2}\/\d{1,2}\/\d{2}\s+(?:deposit|withdrawal)/i.test(lower);
  const hasBalanceSummary =
    lower.includes("opening balance") && lower.includes("closing balance");
  return (
    hasSlashTxn ||
    (hasBalanceSummary && lower.includes("withdrawal") && lower.includes("deposit"))
  );
}

function appendTx(
  rows: DraftTransaction[],
  seen: Set<string>,
  tx: Omit<DraftTransaction, "id">,
  allowDuplicates = false,
): void {
  if (!tx.description || shouldSkipLine(tx.description)) return;
  if (tx.amount === 0) return;

  const key = `${tx.date}|${tx.description.slice(0, 80)}|${tx.amount.toFixed(2)}`;
  if (!allowDuplicates && seen.has(key)) return;
  seen.add(key);

  rows.push({
    id: crypto.randomUUID(),
    date: tx.date,
    description: tx.description.slice(0, 120),
    amount: tx.amount,
    balance: tx.balance,
  });
}

function countRawAmountLines(text: string): number {
  let count = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    WESTPAC_CC_AMOUNT_RE.lastIndex = 0;
    AMOUNT_RE.lastIndex = 0;
    if (WESTPAC_CC_AMOUNT_RE.test(line) || AMOUNT_RE.test(line)) count++;
  }
  return count;
}

function bufferHasAmounts(buffer: string): boolean {
  return /[\d,]+\.\d{2}/.test(buffer);
}

function extractDecimalAmounts(text: string): string[] {
  DECIMAL_AMOUNT_RE.lastIndex = 0;
  return [...text.matchAll(DECIMAL_AMOUNT_RE)].map((m) => m[0]);
}

function amountFromDebitCreditColumns(
  amountStrings: string[],
  description: string,
): number | null {
  const parsed = amountStrings
    .map(parseStatementAmount)
    .filter((v): v is number => v !== null);
  if (parsed.length === 0) return null;

  const lower = description.toLowerCase();

  if (parsed.length >= 3) {
    const debit = parsed[parsed.length - 3]!;
    const credit = parsed[parsed.length - 2]!;
    if (debit > 0 && credit === 0) return -Math.abs(debit);
    if (credit > 0 && debit === 0) return Math.abs(credit);
  }

  if (parsed.length === 2) {
    const movement = parsed[0]!;
    if (lower.includes("withdrawal") || /\bdebit\b/.test(lower)) {
      return -Math.abs(movement);
    }
    if (lower.includes("deposit") || /\bcredit\b/.test(lower)) {
      return Math.abs(movement);
    }
  }

  return pickLineAmount(amountStrings, description);
}

function emitWestpacDcBuffer(
  buffer: string,
  seen: Set<string>,
  rows: DraftTransaction[],
): void {
  const match = buffer.match(WESTPAC_DC_DATE_START_RE);
  if (!match) return;

  const date = normalizeDate(match[1]);
  if (!date) return;

  const rest = match[2].trim();
  if (shouldSkipLine(rest)) return;

  const amountStrings = extractDecimalAmounts(rest);
  if (amountStrings.length === 0) return;

  DECIMAL_AMOUNT_RE.lastIndex = 0;
  const amountMatches = [...rest.matchAll(DECIMAL_AMOUNT_RE)];
  const firstAmountIndex = amountMatches[0]?.index ?? rest.length;
  const description = rest.slice(0, firstAmountIndex).trim().replace(/[-|]\s*$/, "");
  if (description.length < 2 || shouldSkipLine(description)) return;

  const amount = amountFromDebitCreditColumns(amountStrings, description);
  if (amount === null || amount === 0) return;

  let balance: number | undefined;
  if (amountStrings.length >= 2) {
    const balanceVal = parseStatementAmount(amountStrings[amountStrings.length - 1]!);
    if (balanceVal !== null) balance = balanceVal;
  }

  appendTx(rows, seen, { date, description, amount, balance }, true);
}

export function parseWestpacTransactionAccountLines(
  text: string,
  seen = new Set<string>(),
): DraftTransaction[] {
  const rows: DraftTransaction[] = [];
  let buffer: string | null = null;

  const flush = () => {
    if (buffer) {
      emitWestpacDcBuffer(buffer, seen, rows);
      buffer = null;
    }
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;

    if (WESTPAC_DC_DATE_START_RE.test(line)) {
      if (buffer !== null && !bufferHasAmounts(buffer)) {
        buffer = `${buffer} ${line}`;
      } else {
        flush();
        buffer = line;
      }
    } else if (buffer !== null) {
      if (shouldSkipLine(line)) {
        flush();
      } else {
        buffer = `${buffer} ${line}`;
      }
    }
  }

  flush();
  return rows;
}

export function parseGenericTextLines(
  text: string,
  seen = new Set<string>,
): DraftTransaction[] {
  const rows: DraftTransaction[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 8 || shouldSkipLine(line)) continue;

    const dateMatch = line.match(DATE_RE) ?? line.match(TEXT_MONTH_DATE_RE);
    if (!dateMatch) continue;

    const date = normalizeDate(dateMatch[1]);
    if (!date) continue;

    AMOUNT_RE.lastIndex = 0;
    const amounts = [...line.matchAll(AMOUNT_RE)].map((m) => m[0]);
    if (amounts.length === 0) continue;

    let description = line.replace(dateMatch[1], "");
    for (const a of amounts) {
      description = description.replace(a, "");
    }
    description = description.trim().replace(/^[-|]\s*/, "").replace(/\s*[-|]$/, "");
    if (description.length < 2) continue;

    const amount = pickLineAmount(amounts, description);
    if (amount === null || amount === 0) continue;

    appendTx(rows, seen, { date, description, amount });
  }

  return rows;
}

export type { StatementFormat } from "../../types/finance";

export function detectStatementFormat(
  text: string,
  filename: string,
): StatementFormat {
  if (isWestpacTransactionAccount(text, filename)) return "westpac_transaction";
  if (isWestpacCreditCard(text, filename)) return "westpac_credit_card";
  return "generic";
}

export function reconciliationKindForFormat(
  format: StatementFormat,
): ReconciliationKind {
  return format === "westpac_credit_card" ? "credit_card" : "transaction_account";
}

export type StatementParseResult = {
  transactions: DraftTransaction[];
  format: StatementFormat;
  accountName: string;
  stats: ParseStats;
  summary: StatementSummary;
  reconciliation: ReconciliationResult;
  statementReconciliation: ReconciliationResult;
};

export type ParseStatementOptions = {
  format?: StatementFormat;
  accountName?: string;
};

export function parseStatementText(
  text: string,
  filename: string,
  options?: ParseStatementOptions,
): StatementParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
  const format =
    options?.format ?? detectStatementFormat(text, filename);
  const accountName =
    options?.accountName?.trim() ||
    inferAccountName(filename, text, format);
  const reconKind = reconciliationKindForFormat(format);

  let transactions: DraftTransaction[] = [];
  let stats: ParseStats = {
    rawParsedLineCount: countRawAmountLines(text),
    detectedTransactionCount: 0,
    needsReviewCount: 0,
  };

  if (format === "westpac_credit_card") {
    const cc = parseWestpacCreditCardReducer(lines);
    transactions = cc.transactions;
    stats = {
      rawParsedLineCount: Math.max(cc.rawParsedLineCount, stats.rawParsedLineCount),
      detectedTransactionCount: cc.transactions.length,
      needsReviewCount: cc.needsReviewCount,
    };
    if (transactions.length === 0) {
      const seen = new Set<string>();
      transactions = parseGenericTextLines(text, seen);
      stats.detectedTransactionCount = transactions.length;
    }
  } else if (format === "westpac_transaction") {
    const seen = new Set<string>();
    transactions = parseWestpacTransactionAccountLines(text, seen);
    stats.detectedTransactionCount = transactions.length;
  } else {
    const seen = new Set<string>();
    transactions = parseGenericTextLines(text, seen);
    stats.detectedTransactionCount = transactions.length;
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  const summary = extractStatementSummary(text, reconKind);
  const amounts = transactions.map((t) => t.amount);

  const reconciliation = reconcileFromTransactions(summary, amounts, reconKind);

  const statementReconciliation =
    summary.openingBalance !== null &&
    summary.totalCredits !== null &&
    summary.totalDebits !== null &&
    summary.closingBalance !== null
      ? reconcileStatement(
          {
            openingBalance: summary.openingBalance,
            totalCredits: summary.totalCredits,
            totalDebits: summary.totalDebits,
            closingBalance: summary.closingBalance,
          },
          reconKind,
        )
      : reconciliation;

  return {
    transactions,
    format,
    accountName,
    stats,
    summary: {
      ...summary,
      totalCredits: summary.totalCredits ?? sumCredits(amounts),
      totalDebits: summary.totalDebits ?? sumDebits(amounts),
    },
    reconciliation,
    statementReconciliation,
  };
}

// Legacy export for direct CC line testing
export { parseWestpacCreditCardReducer } from "./westpac-cc-reducer";
