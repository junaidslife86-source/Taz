import { isValid, parseISO } from "date-fns";
import type { Transaction } from "../types/finance";
import {
  isExpenseTransaction,
  normalizeReportCategory,
} from "./spend-reports";

export type TrendTimeMode = "mom" | "yoy";

export type TrendSeries = {
  id: string;
  label: string;
  color: string;
  total: number;
};

export type MomChartRow = {
  period: string;
  label: string;
  [seriesId: string]: string | number;
};

export type YoyChartRow = {
  month: string;
  monthIndex: number;
  [yearKey: string]: string | number;
};

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SERIES_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#ca8a04",
  "#0891b2",
  "#db2777",
  "#4f46e5",
];

function monthKeyFromDate(dateStr: string): string | null {
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string): { year: number; monthIndex: number } {
  const [y, m] = key.split("-");
  return { year: Number(y), monthIndex: Number(m) - 1 };
}

function compareMonthKeys(a: string, b: string): number {
  const pa = parseMonthKey(a);
  const pb = parseMonthKey(b);
  return pa.year !== pb.year ? pa.year - pb.year : pa.monthIndex - pb.monthIndex;
}

function buildExpenseBuckets(
  transactions: Transaction[],
): Map<string, Map<string, number>> {
  const byMonth = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const month = monthKeyFromDate(tx.date);
    if (!month) continue;
    const category = normalizeReportCategory(tx.category);
    const id = `cat:${category}`;
    const amount = Math.abs(tx.amount);
    const monthMap = byMonth.get(month) ?? new Map<string, number>();
    monthMap.set(id, (monthMap.get(id) ?? 0) + amount);
    byMonth.set(month, monthMap);
  }

  return byMonth;
}

export function listTrendSeries(transactions: Transaction[]): TrendSeries[] {
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const category = normalizeReportCategory(tx.category);
    const id = `cat:${category}`;
    totals.set(id, (totals.get(id) ?? 0) + Math.abs(tx.amount));
  }

  return [...totals.entries()]
    .map(([id, total], index) => ({
      id,
      label: id.replace(/^cat:/, ""),
      color: SERIES_COLORS[index % SERIES_COLORS.length]!,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

export function countDistinctExpenseMonths(transactions: Transaction[]): number {
  const keys = new Set<string>();
  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const k = monthKeyFromDate(tx.date);
    if (k) keys.add(k);
  }
  return keys.size;
}

export function isYoyAvailable(transactions: Transaction[]): boolean {
  return countDistinctExpenseMonths(transactions) >= 12;
}

export function enumerateYearMonthKeys(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
  );
}

export function enumerateTrailingMonthKeys(endKey: string, count: number): string[] {
  const { year, monthIndex } = parseMonthKey(endKey);
  const out: string[] = [];
  let y = year;
  let m = monthIndex;
  for (let i = 0; i < count; i++) {
    out.unshift(`${y}-${String(m + 1).padStart(2, "0")}`);
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return out;
}

export function filterTransactionsForTrendWindow(
  transactions: Transaction[],
  periodKeys: string[],
): Transaction[] {
  if (!periodKeys.length) return transactions;
  const keySet = new Set(periodKeys);
  return transactions.filter((tx) => {
    const k = monthKeyFromDate(tx.date);
    return k != null && keySet.has(k);
  });
}

export function defaultSelectedSeriesIds(
  series: TrendSeries[],
  max = 6,
): string[] {
  return series
    .filter((s) => s.total > 0)
    .slice(0, max)
    .map((s) => s.id);
}

export function buildMomChartData(
  transactions: Transaction[],
  selectedSeriesIds: string[],
  periodKeys?: string[],
): MomChartRow[] {
  const buckets = buildExpenseBuckets(transactions);
  const monthKeys =
    periodKeys && periodKeys.length > 0
      ? periodKeys
      : [...buckets.keys()].sort(compareMonthKeys);
  const selected = new Set(selectedSeriesIds);

  return monthKeys.map((period) => {
    const { monthIndex, year } = parseMonthKey(period);
    const row: MomChartRow = {
      period,
      label: `${MONTH_SHORT[monthIndex]} ${year}`,
    };
    const monthMap = buckets.get(period);
    for (const id of selected) {
      row[id] = monthMap?.get(id) ?? 0;
    }
    return row;
  });
}

export function buildYoyChartData(
  transactions: Transaction[],
  selectedSeriesIds: string[],
): { rows: YoyChartRow[]; years: number[] } {
  const buckets = buildExpenseBuckets(transactions);
  const years = new Set<number>();
  for (const key of buckets.keys()) {
    years.add(parseMonthKey(key).year);
  }
  const yearList = [...years].sort((a, b) => a - b);
  const selected = new Set(selectedSeriesIds);

  const rows: YoyChartRow[] = MONTH_SHORT.map((month, monthIndex) => {
    const row: YoyChartRow = { month, monthIndex };
    for (const year of yearList) {
      const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const monthMap = buckets.get(period);
      let sum = 0;
      if (monthMap) {
        for (const id of selected) {
          sum += monthMap.get(id) ?? 0;
        }
      }
      row[String(year)] = sum;
    }
    return row;
  });

  return { rows, years: yearList };
}
