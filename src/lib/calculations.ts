import {
  startOfMonth,
  endOfMonth,
  subDays,
  isWithinInterval,
  parseISO,
  isValid,
} from "date-fns";
import type { Asset, Liability, Transaction } from "../types/finance";

export type SpendingPeriod = "month" | "last30days" | "all";

export function spendingPeriodLabel(
  period: SpendingPeriod,
  referenceDate = new Date(),
): string {
  switch (period) {
    case "month":
      return referenceDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    case "last30days":
      return "Last 30 days";
    case "all":
      return "All time";
  }
}

export function totalAssets(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.value, 0);
}

export function totalLiabilities(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + l.balance, 0);
}

export function netWorth(assets: Asset[], liabilities: Liability[]): number {
  return totalAssets(assets) - totalLiabilities(liabilities);
}

export function cashBalance(assets: Asset[]): number {
  return assets
    .filter((a) => a.assetType === "cash")
    .reduce((sum, a) => sum + a.value, 0);
}

export function investmentBalance(assets: Asset[]): number {
  const investmentTypes = new Set([
    "stock",
    "etf",
    "crypto",
    "superannuation",
    "other",
  ]);
  return assets
    .filter((a) => investmentTypes.has(a.assetType))
    .reduce((sum, a) => sum + a.value, 0);
}

export function monthlyIncome(
  transactions: Transaction[],
  referenceDate = new Date(),
): number {
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  return sumTransactionsInRange(transactions, start, end, "income");
}

export function monthlyExpenses(
  transactions: Transaction[],
  referenceDate = new Date(),
): number {
  return sumExpensesInPeriod(transactions, "month", referenceDate);
}

export function sumExpensesInPeriod(
  transactions: Transaction[],
  period: SpendingPeriod,
  referenceDate = new Date(),
): number {
  return transactions
    .filter((t) => {
      if (t.type !== "expense") return false;
      const date = parseISO(t.date);
      if (!isValid(date) || !expenseInSpendingPeriod(date, period, referenceDate)) {
        return false;
      }
      return true;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function sumTransactionsInRange(
  transactions: Transaction[],
  start: Date,
  end: Date,
  type: "income" | "expense",
): number {
  return transactions
    .filter((t) => {
      if (t.type !== type) return false;
      const date = parseISO(t.date);
      if (!isValid(date)) return false;
      return isWithinInterval(date, { start, end });
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function expenseInSpendingPeriod(
  date: Date,
  period: SpendingPeriod,
  referenceDate: Date,
): boolean {
  if (period === "all") return true;

  if (period === "last30days") {
    const end = referenceDate;
    const start = subDays(end, 30);
    return isWithinInterval(date, { start, end });
  }

  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  return isWithinInterval(date, { start, end });
}

export function spendingByCategory(
  transactions: Transaction[],
  options: {
    period?: SpendingPeriod;
    referenceDate?: Date;
  } = {},
): { category: string; amount: number }[] {
  const period = options.period ?? "last30days";
  const referenceDate = options.referenceDate ?? new Date();
  const map = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const date = parseISO(t.date);
    if (!isValid(date) || !expenseInSpendingPeriod(date, period, referenceDate)) {
      continue;
    }
    map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
  }

  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function assetAllocation(
  assets: Asset[],
): { name: string; value: number; type: string }[] {
  return assets
    .map((a) => ({ name: a.name, value: a.value, type: a.assetType }))
    .sort((a, b) => b.value - a.value);
}

export function liabilityBreakdown(
  liabilities: Liability[],
): { name: string; balance: number; type: string }[] {
  return liabilities
    .map((l) => ({ name: l.name, balance: l.balance, type: l.liabilityType }))
    .sort((a, b) => b.balance - a.balance);
}

export function transactionFingerprint(t: Transaction): string {
  return `${t.date}|${t.description}|${t.amount}|${t.accountName ?? ""}`;
}

export function findDuplicates(
  existing: Transaction[],
  incoming: Transaction[],
): Transaction[] {
  const fingerprints = new Set(existing.map(transactionFingerprint));
  return incoming.filter((t) => fingerprints.has(transactionFingerprint(t)));
}
