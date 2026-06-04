import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isValid,
} from "date-fns";
import type { Asset, Liability, Transaction } from "../types/finance";

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
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  return sumTransactionsInRange(transactions, start, end, "expense");
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

export function spendingByCategory(
  transactions: Transaction[],
  referenceDate = new Date(),
): { category: string; amount: number }[] {
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  const map = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const date = parseISO(t.date);
    if (!isValid(date) || !isWithinInterval(date, { start, end })) continue;
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
