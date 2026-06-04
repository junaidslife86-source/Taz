export type StatementSummary = {
  openingBalance: number | null;
  totalCredits: number | null;
  totalDebits: number | null;
  closingBalance: number | null;
};

export type ReconciliationKind = "credit_card" | "transaction_account";

export type ReconciliationResult = {
  calculatedClosing: number | null;
  expectedClosing: number | null;
  difference: number | null;
  isBalanced: boolean;
  formula: string;
};

export function sumCredits(amounts: number[]): number {
  return round2(amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0));
}

export function sumDebits(amounts: number[]): number {
  return round2(amounts.filter((a) => a < 0).reduce((s, a) => s + Math.abs(a), 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function reconcileStatement(
  summary: StatementSummary,
  kind: ReconciliationKind,
): ReconciliationResult {
  const { openingBalance, totalCredits, totalDebits, closingBalance } = summary;

  if (
    openingBalance === null ||
    totalCredits === null ||
    totalDebits === null ||
    closingBalance === null
  ) {
    return {
      calculatedClosing: null,
      expectedClosing: closingBalance,
      difference: null,
      isBalanced: false,
      formula:
        kind === "credit_card"
          ? "Opening − credits + debits = closing"
          : "Opening + credits − debits = closing",
    };
  }

  const calculatedClosing =
    kind === "credit_card"
      ? round2(openingBalance - totalCredits + totalDebits)
      : round2(openingBalance + totalCredits - totalDebits);

  const difference = round2(calculatedClosing - closingBalance);

  return {
    calculatedClosing,
    expectedClosing: closingBalance,
    difference,
    isBalanced: Math.abs(difference) < 0.02,
    formula:
      kind === "credit_card"
        ? "Opening − credits + debits = closing"
        : "Opening + credits − debits = closing",
  };
}

export function reconcileFromTransactions(
  summary: StatementSummary,
  amounts: number[],
  kind: ReconciliationKind,
): ReconciliationResult {
  const parsedCredits = sumCredits(amounts);
  const parsedDebits = sumDebits(amounts);

  return reconcileStatement(
    {
      openingBalance: summary.openingBalance,
      totalCredits: parsedCredits,
      totalDebits: parsedDebits,
      closingBalance: summary.closingBalance,
    },
    kind,
  );
}

const BALANCE_AMOUNT_RE = /[\d,]+\.\d{2}/;

function parseBalanceFromContext(text: string): number | null {
  const matches = text.match(BALANCE_AMOUNT_RE);
  if (!matches?.length) return null;
  const raw = matches[matches.length - 1].replace(/,/g, "");
  const value = parseFloat(raw);
  return isNaN(value) ? null : value;
}

export function extractStatementSummary(
  text: string,
  kind: ReconciliationKind,
): StatementSummary {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());

  let opening: number | null = null;
  let closing: number | null = null;
  let totalCredits: number | null = null;
  let totalDebits: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = line.toLowerCase();

    if (opening === null && /opening balance/.test(ln)) {
      opening = parseBalanceFromContext(line + " " + (lines[i + 1] ?? ""));
    }
    if (closing === null && /closing balance/.test(ln) && !/opening/.test(ln)) {
      closing = parseBalanceFromContext(line + " " + (lines[i + 1] ?? ""));
    }

    if (kind === "credit_card") {
      if (
        totalCredits === null &&
        (ln.includes("payments and other credits") ||
          ln.includes("payment credits") ||
          ln.includes("total credits"))
      ) {
        totalCredits = parseBalanceFromContext(line + " " + (lines[i + 1] ?? ""));
      }
      if (
        totalDebits === null &&
        (ln.includes("purchases") ||
          ln.includes("cash advances") ||
          ln.includes("total debits") ||
          ln.includes("fees and interest"))
      ) {
        totalDebits = parseBalanceFromContext(line + " " + (lines[i + 1] ?? ""));
      }
    } else {
      if (totalCredits === null && /total credits/.test(ln)) {
        totalCredits = parseBalanceFromContext(line + " " + (lines[i + 1] ?? ""));
      }
      if (totalDebits === null && /total debits/.test(ln)) {
        totalDebits = parseBalanceFromContext(line + " " + (lines[i + 1] ?? ""));
      }
    }
  }

  if (kind === "credit_card" && opening !== null && closing !== null) {
    if (totalCredits === null) totalCredits = opening;
  }

  return {
    openingBalance: opening,
    totalCredits,
    totalDebits,
    closingBalance: closing,
  };
}

export type ParseStats = {
  rawParsedLineCount: number;
  detectedTransactionCount: number;
  needsReviewCount: number;
};
