import {
  endOfMonth,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { Transaction } from "../types/finance";

export type SpendPeriodMode = "month" | "year";

export type MonthOption = {
  key: string;
  label: string;
  monthIndex: number;
  year: number;
};

export type YearOption = {
  year: number;
  label: string;
};

export type SpendingSlice = {
  name: string;
  value: number;
  percent: number;
  color: string;
};

export type SpendingSummary = {
  totalTransactions: number;
  largestTransaction: number;
  averageTransaction: number;
  totalSpending: number;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const CATEGORY_CHART_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#ca8a04",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#0d9488",
  "#ea580c",
];

function expenseAmount(tx: Transaction): number {
  return Math.abs(tx.amount);
}

export function isExpenseTransaction(tx: Transaction): boolean {
  return tx.type === "expense";
}

export function normalizeReportCategory(category: string): string {
  const trimmed = category.trim();
  return trimmed || "Other";
}

function monthKeyFromDate(dateStr: string): string | null {
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function listMonthOptionsFromTransactions(
  transactions: Transaction[],
): MonthOption[] {
  const keys = new Map<string, MonthOption>();

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const d = parseISO(tx.date);
    if (!isValid(d)) continue;
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    keys.set(key, {
      key,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      monthIndex,
      year,
    });
  }

  const options = [...keys.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex,
  );

  if (options.length) return options;

  const now = new Date();
  return [
    {
      key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
      monthIndex: now.getMonth(),
      year: now.getFullYear(),
    },
  ];
}

export function listYearOptionsFromTransactions(
  transactions: Transaction[],
): YearOption[] {
  const years = new Set<number>();
  for (const tx of transactions) {
    const d = parseISO(tx.date);
    if (!isValid(d)) continue;
    years.add(d.getFullYear());
  }
  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length) {
    return sorted.map((year) => ({ year, label: String(year) }));
  }
  const y = new Date().getFullYear();
  return [{ year: y, label: String(y) }];
}

export function monthDateRangeLabel(month: MonthOption): string {
  const start = new Date(month.year, month.monthIndex, 1);
  const end = endOfMonth(start);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function yearDateRangeLabel(year: number): string {
  return `1 Jan ${year} – 31 Dec ${year}`;
}

export function filterExpensesForMonth(
  transactions: Transaction[],
  month: MonthOption,
): Transaction[] {
  return transactions
    .filter((tx) => {
      if (!isExpenseTransaction(tx)) return false;
      const d = parseISO(tx.date);
      if (!isValid(d)) return false;
      return d.getMonth() === month.monthIndex && d.getFullYear() === month.year;
    })
    .map((tx) => ({
      ...tx,
      category: normalizeReportCategory(tx.category),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function filterExpensesForYear(
  transactions: Transaction[],
  year: number,
): Transaction[] {
  return transactions
    .filter((tx) => {
      if (!isExpenseTransaction(tx)) return false;
      const d = parseISO(tx.date);
      if (!isValid(d)) return false;
      return d.getFullYear() === year;
    })
    .map((tx) => ({
      ...tx,
      category: normalizeReportCategory(tx.category),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function computeSpendingByCategory(
  expenses: Transaction[],
): { slices: SpendingSlice[]; total: number } {
  const totals = new Map<string, number>();

  for (const tx of expenses) {
    const category = normalizeReportCategory(tx.category);
    totals.set(category, (totals.get(category) ?? 0) + expenseAmount(tx));
  }

  const entries = [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  const slices: SpendingSlice[] = entries.map(([name, value], index) => ({
    name,
    value,
    percent: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]!,
  }));

  return { slices, total };
}

export function computeSpendingSummary(expenses: Transaction[]): SpendingSummary {
  if (expenses.length === 0) {
    return {
      totalTransactions: 0,
      largestTransaction: 0,
      averageTransaction: 0,
      totalSpending: 0,
    };
  }
  const amounts = expenses.map(expenseAmount);
  const totalSpending = amounts.reduce((s, a) => s + a, 0);
  return {
    totalTransactions: expenses.length,
    largestTransaction: Math.max(...amounts),
    averageTransaction: totalSpending / expenses.length,
    totalSpending,
  };
}

export function monthKeyFromTransaction(dateStr: string): string | null {
  return monthKeyFromDate(dateStr);
}

export function startOfMonthFromKey(key: string): Date | null {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return null;
  return startOfMonth(new Date(y, m - 1, 1));
}
