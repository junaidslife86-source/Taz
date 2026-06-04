import {
  addDays,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import type { Asset, Category, Transaction } from "../types/finance";
import {
  cashBalance,
  monthlyExpenses,
  monthlyIncome,
  spendingByCategory,
} from "./calculations";
import {
  computeSpendingSummary,
  filterExpensesForYear,
  isExpenseTransaction,
  listMonthOptionsFromTransactions,
  listYearOptionsFromTransactions,
  normalizeReportCategory,
  yearDateRangeLabel,
  type MonthOption,
  type YearOption,
} from "./spend-reports";
import { categoryTheme } from "./category-theme";

export type { MonthOption, YearOption };
export { listMonthOptionsFromTransactions, listYearOptionsFromTransactions };

export type OverviewPeriodMode = "month" | "year";

export type OverviewPeriod =
  | { mode: "month"; month: MonthOption }
  | { mode: "year"; year: number };

export type MetricTone = "income" | "spent" | "left" | "projected";

export type OverviewSummary = {
  income: number;
  spent: number;
  leftToSpend: number;
  projectedEndBalance: number;
  incomeChangePct: number | null;
  spentChangePct: number | null;
  leftChangePct: number | null;
  projectedLabel: string;
  incomeSparkline: number[];
  spentSparkline: number[];
  leftSparkline: number[];
  projectedSparkline: number[];
};

export type CategorySpendRow = {
  name: string;
  amount: number;
  percentOfTotal: number;
  changePct: number | null;
};

export type InsightRow = {
  id: string;
  category: string;
  title: string;
  description: string;
};

export type CashFlowPoint = {
  date: string;
  label: string;
  income: number;
  expenses: number;
};

export type UpcomingBill = {
  id: string;
  merchant: string;
  category: string;
  dueLabel: string;
  amount: number;
};

export type RecurringSpendRow = {
  id: string;
  merchant: string;
  category: string;
  frequencyLabel: string;
  yearTotal: number;
};

export type RecentTransactionRow = {
  transaction: Transaction;
  categoryLabel: string;
  subtitle: string;
  changePct: number | null;
};

export type YearPeriodDetails = {
  periodLabel: string;
  totalIncome: number;
  totalSpending: number;
  totalTransactions: number;
  largestTransaction: number;
  averageTransaction: number;
  netSurplus: number;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FALLBACK_BILLS: UpcomingBill[] = [
  { id: "fb-1", merchant: "BUPA", category: "Insurance", dueLabel: "14 Jun", amount: 196.01 },
  { id: "fb-2", merchant: "Spotify", category: "Entertainment", dueLabel: "18 Jun", amount: 14.99 },
  { id: "fb-3", merchant: "Internet", category: "Utilities", dueLabel: "23 Jun", amount: 89 },
  { id: "fb-4", merchant: "Phone Plan", category: "Utilities", dueLabel: "28 Jun", amount: 49 },
];

function expenseAmount(tx: Transaction): number {
  return Math.abs(tx.amount);
}

export function referenceDateForMonth(month: MonthOption): Date {
  const now = new Date();
  if (now.getFullYear() === month.year && now.getMonth() === month.monthIndex) {
    return now;
  }
  return endOfMonth(new Date(month.year, month.monthIndex, 1));
}

export function referenceDateForYear(year: number): Date {
  const now = new Date();
  if (now.getFullYear() === year) return now;
  return endOfYear(new Date(year, 0, 1));
}

export function referenceDateForPeriod(period: OverviewPeriod): Date {
  return period.mode === "month"
    ? referenceDateForMonth(period.month)
    : referenceDateForYear(period.year);
}

export function periodSubtitle(period: OverviewPeriod): string {
  if (period.mode === "month") {
    return `Here's your financial overview for ${MONTH_NAMES[period.month.monthIndex]}`;
  }
  return `Here's your financial overview for ${period.year}`;
}

export function comparisonLabel(period: OverviewPeriod): string {
  return period.mode === "month" ? "vs last month" : "vs last year";
}

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function sumInYear(
  transactions: Transaction[],
  year: number,
  type: "income" | "expense",
): number {
  return transactions
    .filter((t) => {
      if (t.type !== type) return false;
      const d = parseISO(t.date);
      return isValid(d) && d.getFullYear() === year;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function spendingByCategoryInYear(
  transactions: Transaction[],
  year: number,
): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (!isExpenseTransaction(t)) continue;
    const d = parseISO(t.date);
    if (!isValid(d) || d.getFullYear() !== year) continue;
    const cat = normalizeReportCategory(t.category);
    map.set(cat, (map.get(cat) ?? 0) + expenseAmount(t));
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function transactionsInMonth(
  transactions: Transaction[],
  month: MonthOption,
): Transaction[] {
  const start = startOfMonth(new Date(month.year, month.monthIndex, 1));
  const end = endOfMonth(start);
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    if (!isValid(d)) return false;
    return d >= start && d <= end;
  });
}

function transactionsInYear(
  transactions: Transaction[],
  year: number,
): Transaction[] {
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    return isValid(d) && d.getFullYear() === year;
  });
}

function dailyExpenseSparkline(
  transactions: Transaction[],
  month: MonthOption,
  ref: Date,
): number[] {
  const start = startOfMonth(new Date(month.year, month.monthIndex, 1));
  const dayCount = ref.getDate();
  const daily = new Array<number>(dayCount).fill(0);

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const d = parseISO(tx.date);
    if (!isValid(d) || d < start || d > ref) continue;
    daily[d.getDate() - 1] = (daily[d.getDate() - 1] ?? 0) + expenseAmount(tx);
  }

  const cumulative: number[] = [];
  let sum = 0;
  for (let i = 0; i < dayCount; i++) {
    sum += daily[i] ?? 0;
    cumulative.push(sum);
  }
  return cumulative.length ? cumulative : [0];
}

function dailyIncomeSparkline(
  transactions: Transaction[],
  month: MonthOption,
  ref: Date,
): number[] {
  const start = startOfMonth(new Date(month.year, month.monthIndex, 1));
  const dayCount = ref.getDate();
  const daily = new Array<number>(dayCount).fill(0);

  for (const tx of transactions) {
    if (tx.type !== "income") continue;
    const d = parseISO(tx.date);
    if (!isValid(d) || d < start || d > ref) continue;
    daily[d.getDate() - 1] = (daily[d.getDate() - 1] ?? 0) + Math.abs(tx.amount);
  }

  const cumulative: number[] = [];
  let sum = 0;
  for (let i = 0; i < dayCount; i++) {
    sum += daily[i] ?? 0;
    cumulative.push(sum);
  }
  return cumulative.length ? cumulative : [0];
}

function monthlySparklineInYear(
  transactions: Transaction[],
  year: number,
  ref: Date,
  type: "income" | "expense",
): number[] {
  const lastMonth = ref.getMonth();
  const cumulative: number[] = [];
  let sum = 0;
  for (let m = 0; m <= lastMonth; m++) {
    const start = new Date(year, m, 1);
    const end = m === lastMonth ? ref : endOfMonth(start);
    let monthSum = 0;
    for (const tx of transactions) {
      if (tx.type !== type) continue;
      const d = parseISO(tx.date);
      if (!isValid(d) || d < start || d > end) continue;
      monthSum += Math.abs(tx.amount);
    }
    sum += monthSum;
    cumulative.push(sum);
  }
  return cumulative.length ? cumulative : [0];
}

function buildMonthOverviewSummary(
  transactions: Transaction[],
  assets: Asset[],
  month: MonthOption,
): OverviewSummary {
  const ref = referenceDateForMonth(month);
  const prevMonth = subMonths(new Date(month.year, month.monthIndex, 1), 1);
  const prevMonthOpt: MonthOption = {
    key: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`,
    label: "",
    monthIndex: prevMonth.getMonth(),
    year: prevMonth.getFullYear(),
  };

  const income = monthlyIncome(transactions, ref);
  const spent = monthlyExpenses(transactions, ref);
  const prevIncome = monthlyIncome(transactions, referenceDateForMonth(prevMonthOpt));
  const prevSpent = monthlyExpenses(transactions, referenceDateForMonth(prevMonthOpt));
  const leftToSpend = income - spent;
  const prevLeft = prevIncome - prevSpent;

  const cash = cashBalance(assets);
  const daysInMonth = endOfMonth(ref).getDate();
  const dayOfMonth = ref.getDate();
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
  const dailySpend = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const projectedSpend = spent + dailySpend * daysRemaining;
  const projectedEndBalance = cash + income - projectedSpend;

  const incomeSpark = dailyIncomeSparkline(transactions, month, ref);
  const spentSpark = dailyExpenseSparkline(transactions, month, ref);
  const leftSpark = incomeSpark.map((v, i) => v - (spentSpark[i] ?? 0));
  const projectedSpark = spentSpark.map((v, i) => {
    const inc = incomeSpark[i] ?? 0;
    const day = i + 1;
    const avg = day > 0 ? v / day : 0;
    return cash + inc - (v + avg * (daysInMonth - day));
  });

  const onTrack = projectedEndBalance >= cash + leftToSpend * 0.85;

  return {
    income,
    spent,
    leftToSpend,
    projectedEndBalance,
    incomeChangePct: pctChange(income, prevIncome),
    spentChangePct: pctChange(spent, prevSpent),
    leftChangePct: pctChange(leftToSpend, prevLeft),
    projectedLabel: onTrack ? "On track" : "Watch spending",
    incomeSparkline: incomeSpark,
    spentSparkline: spentSpark,
    leftSparkline: leftSpark,
    projectedSparkline: projectedSpark.length ? projectedSpark : [cash],
  };
}

function buildYearOverviewSummary(
  transactions: Transaction[],
  assets: Asset[],
  year: number,
): OverviewSummary {
  const ref = referenceDateForYear(year);
  const prevYear = year - 1;
  const income = sumInYear(transactions, year, "income");
  const spent = sumInYear(transactions, year, "expense");
  const prevIncome = sumInYear(transactions, prevYear, "income");
  const prevSpent = sumInYear(transactions, prevYear, "expense");
  const leftToSpend = income - spent;
  const prevLeft = prevIncome - prevSpent;
  const cash = cashBalance(assets);

  const monthsElapsed = ref.getMonth() + 1;
  const isCurrentYear = new Date().getFullYear() === year;
  let projectedEndBalance = leftToSpend;
  let projectedLabel = "Year total saved";

  if (isCurrentYear && monthsElapsed > 0) {
    const monthlySpend = spent / monthsElapsed;
    const projectedAnnualSpend = monthlySpend * 12;
    const projectedAnnualIncome =
      income > 0 ? (income / monthsElapsed) * 12 : 0;
    projectedEndBalance = projectedAnnualIncome - projectedAnnualSpend;
    projectedLabel =
      projectedEndBalance >= leftToSpend * 0.85
        ? "On track for year"
        : "Spending above pace";
  }

  const incomeSpark = monthlySparklineInYear(transactions, year, ref, "income");
  const spentSpark = monthlySparklineInYear(transactions, year, ref, "expense");
  const leftSpark = incomeSpark.map((v, i) => v - (spentSpark[i] ?? 0));
  const projectedSpark = leftSpark.map((v) => cash + v);

  return {
    income,
    spent,
    leftToSpend,
    projectedEndBalance,
    incomeChangePct: pctChange(income, prevIncome),
    spentChangePct: pctChange(spent, prevSpent),
    leftChangePct: pctChange(leftToSpend, prevLeft),
    projectedLabel,
    incomeSparkline: incomeSpark,
    spentSparkline: spentSpark,
    leftSparkline: leftSpark,
    projectedSparkline: projectedSpark.length ? projectedSpark : [cash],
  };
}

export function buildOverviewSummary(
  transactions: Transaction[],
  assets: Asset[],
  period: OverviewPeriod,
): OverviewSummary {
  return period.mode === "month"
    ? buildMonthOverviewSummary(transactions, assets, period.month)
    : buildYearOverviewSummary(transactions, assets, period.year);
}

export function buildYearPeriodDetails(
  transactions: Transaction[],
  year: number,
): YearPeriodDetails {
  const expenses = filterExpensesForYear(transactions, year);
  const summary = computeSpendingSummary(expenses);
  const totalIncome = sumInYear(transactions, year, "income");
  return {
    periodLabel: yearDateRangeLabel(year),
    totalIncome,
    totalSpending: summary.totalSpending,
    totalTransactions: summary.totalTransactions,
    largestTransaction: summary.largestTransaction,
    averageTransaction: summary.averageTransaction,
    netSurplus: totalIncome - summary.totalSpending,
  };
}

function buildMonthCategorySpendRows(
  transactions: Transaction[],
  month: MonthOption,
  limit: number,
): CategorySpendRow[] {
  const ref = referenceDateForMonth(month);
  const prev = subMonths(new Date(month.year, month.monthIndex, 1), 1);
  const current = spendingByCategory(transactions, {
    period: "month",
    referenceDate: ref,
  });
  const previous = spendingByCategory(transactions, {
    period: "month",
    referenceDate: endOfMonth(prev),
  });
  const prevMap = new Map(
    previous.map((r) => [normalizeReportCategory(r.category), r.amount]),
  );
  const total = current.reduce((s, r) => s + r.amount, 0) || 1;

  return current.slice(0, limit).map((row) => {
    const name = normalizeReportCategory(row.category);
    return {
      name,
      amount: row.amount,
      percentOfTotal: Math.round((row.amount / total) * 100),
      changePct: pctChange(row.amount, prevMap.get(name) ?? 0),
    };
  });
}

function buildYearCategorySpendRows(
  transactions: Transaction[],
  year: number,
  limit: number,
): CategorySpendRow[] {
  const current = spendingByCategoryInYear(transactions, year);
  const previous = spendingByCategoryInYear(transactions, year - 1);
  const prevMap = new Map(previous.map((r) => [r.category, r.amount]));
  const total = current.reduce((s, r) => s + r.amount, 0) || 1;

  return current.slice(0, limit).map((row) => ({
    name: row.category,
    amount: row.amount,
    percentOfTotal: Math.round((row.amount / total) * 100),
    changePct: pctChange(row.amount, prevMap.get(row.category) ?? 0),
  }));
}

export function buildCategorySpendRows(
  transactions: Transaction[],
  period: OverviewPeriod,
  limit = 8,
): CategorySpendRow[] {
  return period.mode === "month"
    ? buildMonthCategorySpendRows(transactions, period.month, limit)
    : buildYearCategorySpendRows(transactions, period.year, limit);
}

export function buildInsights(
  transactions: Transaction[],
  period: OverviewPeriod,
  summary: OverviewSummary,
): InsightRow[] {
  const rows = buildCategorySpendRows(transactions, period, 6);
  const prior = period.mode === "month" ? "last month" : "last year";
  const insights: InsightRow[] = [];

  for (const row of rows) {
    if (row.changePct === null) continue;
    if (Math.abs(row.changePct) >= 15) {
      const up = row.changePct > 0;
      insights.push({
        id: `cat-${row.name}`,
        category: row.name,
        title: `${row.name} is ${up ? "up" : "down"} ${Math.abs(row.changePct)}%`,
        description: up
          ? `You spent more on ${row.name.toLowerCase()} than ${prior}.`
          : `You spent less on ${row.name.toLowerCase()} than ${prior}.`,
      });
    } else if (Math.abs(row.changePct) < 8) {
      insights.push({
        id: `normal-${row.name}`,
        category: row.name,
        title: `${row.name} spending is normal`,
        description: `Within your usual range compared to ${prior}.`,
      });
    }
    if (insights.length >= 2) break;
  }

  const recurring = detectRecurringMerchants(transactions);
  if (recurring.length > 0 && insights.length < 4) {
    const top = recurring[0]!;
    insights.push({
      id: `recurring-${top.merchant}`,
      category: top.category,
      title: `${top.merchant} recurring charge`,
      description: `Typical payment of about $${top.amount.toFixed(0)}.`,
    });
  }

  if (summary.leftToSpend > 0 && insights.length < 4) {
    const periodWord = period.mode === "month" ? "this month" : "this year";
    insights.push({
      id: "savings-track",
      category: "Income",
      title: `On track to save $${Math.round(summary.leftToSpend).toLocaleString()}`,
      description: `Based on income minus spending ${periodWord}.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "welcome",
      category: "Other",
      title: "Add transactions to unlock insights",
      description: "Import a statement or add expenses to see personalized tips.",
    });
  }

  return insights.slice(0, 4);
}

function detectRecurringMerchants(
  transactions: Transaction[],
): { merchant: string; category: string; amount: number }[] {
  const byDesc = new Map<
    string,
    { months: Set<string>; amounts: number[]; category: string; merchant: string }
  >();

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const d = parseISO(tx.date);
    if (!isValid(d)) continue;
    const key = tx.description.trim().toLowerCase().slice(0, 40);
    if (!key) continue;
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    let entry = byDesc.get(key);
    if (!entry) {
      entry = {
        months: new Set(),
        amounts: [],
        category: normalizeReportCategory(tx.category),
        merchant: tx.description.trim().slice(0, 32) || "Payment",
      };
      byDesc.set(key, entry);
    }
    entry.months.add(monthKey);
    entry.amounts.push(expenseAmount(tx));
  }

  const results: { merchant: string; category: string; amount: number }[] = [];
  for (const entry of byDesc.values()) {
    if (entry.months.size < 2) continue;
    results.push({
      merchant: entry.merchant,
      category: entry.category,
      amount:
        entry.amounts.reduce((a, b) => a + b, 0) / entry.amounts.length,
    });
  }
  return results.sort((a, b) => b.amount - a.amount);
}

function buildMonthCashFlow(
  transactions: Transaction[],
  month: MonthOption,
): CashFlowPoint[] {
  const ref = referenceDateForMonth(month);
  const start = startOfMonth(new Date(month.year, month.monthIndex, 1));
  const points: CashFlowPoint[] = [];

  for (let d = start; d <= ref; d = addDays(d, 1)) {
    const dayEnd = addDays(d, 1);
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      const td = parseISO(tx.date);
      if (!isValid(td) || td < d || td >= dayEnd) continue;
      if (tx.type === "income") income += Math.abs(tx.amount);
      if (isExpenseTransaction(tx)) expenses += expenseAmount(tx);
    }
    points.push({
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "d MMM"),
      income,
      expenses,
    });
  }
  return points;
}

function buildYearCashFlow(
  transactions: Transaction[],
  year: number,
): CashFlowPoint[] {
  const ref = referenceDateForYear(year);
  const lastMonth = ref.getMonth();
  const points: CashFlowPoint[] = [];

  for (let m = 0; m <= lastMonth; m++) {
    const start = new Date(year, m, 1);
    const end = m === lastMonth ? ref : endOfMonth(start);
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      const td = parseISO(tx.date);
      if (!isValid(td) || td < start || td > end) continue;
      if (tx.type === "income") income += Math.abs(tx.amount);
      if (isExpenseTransaction(tx)) expenses += expenseAmount(tx);
    }
    points.push({
      date: format(start, "yyyy-MM"),
      label: format(start, "MMM"),
      income,
      expenses,
    });
  }
  return points;
}

export function buildCashFlowSeries(
  transactions: Transaction[],
  period: OverviewPeriod,
): CashFlowPoint[] {
  return period.mode === "month"
    ? buildMonthCashFlow(transactions, period.month)
    : buildYearCashFlow(transactions, period.year);
}

export function buildUpcomingBills(
  transactions: Transaction[],
  month: MonthOption,
): UpcomingBill[] {
  const monthStart = startOfMonth(new Date(month.year, month.monthIndex, 1));
  const byDesc = new Map<
    string,
    { days: number[]; amounts: number[]; category: string; merchant: string }
  >();

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const d = parseISO(tx.date);
    if (!isValid(d)) continue;
    const key = tx.description.trim().toLowerCase().slice(0, 40);
    if (!key) continue;
    let entry = byDesc.get(key);
    if (!entry) {
      entry = {
        days: [],
        amounts: [],
        category: normalizeReportCategory(tx.category),
        merchant: tx.description.trim().slice(0, 28) || "Bill",
      };
      byDesc.set(key, entry);
    }
    entry.days.push(d.getDate());
    entry.amounts.push(expenseAmount(tx));
  }

  const bills: UpcomingBill[] = [];
  for (const [key, entry] of byDesc) {
    if (entry.days.length < 2) continue;
    const dueDay = Math.round(
      entry.days.reduce((a, b) => a + b, 0) / entry.days.length,
    );
    const due = new Date(month.year, month.monthIndex, Math.min(dueDay, 28));
    if (due < monthStart) continue;
    bills.push({
      id: `bill-${key}`,
      merchant: entry.merchant,
      category: entry.category,
      dueLabel: format(due, "d MMM"),
      amount:
        entry.amounts.reduce((a, b) => a + b, 0) / entry.amounts.length,
    });
  }

  bills.sort((a, b) => a.dueLabel.localeCompare(b.dueLabel));
  if (bills.length >= 2) return bills.slice(0, 6);

  const fallbackDays = [14, 18, 23, 28];
  return FALLBACK_BILLS.map((b, i) => ({
    ...b,
    dueLabel: format(
      new Date(month.year, month.monthIndex, fallbackDays[i] ?? 14),
      "d MMM",
    ),
  }));
}

export function buildRecurringSpendForYear(
  transactions: Transaction[],
  year: number,
  limit = 6,
): RecurringSpendRow[] {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(yearStart);
  const byDesc = new Map<
    string,
    {
      amounts: number[];
      category: string;
      merchant: string;
      months: Set<number>;
    }
  >();

  for (const tx of transactions) {
    if (!isExpenseTransaction(tx)) continue;
    const d = parseISO(tx.date);
    if (!isValid(d) || d < yearStart || d > yearEnd) continue;
    const key = tx.description.trim().toLowerCase().slice(0, 40);
    if (!key) continue;
    let entry = byDesc.get(key);
    if (!entry) {
      entry = {
        amounts: [],
        category: normalizeReportCategory(tx.category),
        merchant: tx.description.trim().slice(0, 28) || "Payment",
        months: new Set(),
      };
      byDesc.set(key, entry);
    }
    entry.amounts.push(expenseAmount(tx));
    entry.months.add(d.getMonth());
  }

  const rows: RecurringSpendRow[] = [];
  for (const [key, entry] of byDesc) {
    if (entry.months.size < 2 && entry.amounts.length < 2) continue;
    const yearTotal = entry.amounts.reduce((a, b) => a + b, 0);
    const monthsActive = entry.months.size || 1;
    rows.push({
      id: `rec-${key}`,
      merchant: entry.merchant,
      category: entry.category,
      frequencyLabel:
        monthsActive >= 10
          ? "Monthly"
          : monthsActive >= 4
            ? "Regular"
            : "Occasional",
      yearTotal,
    });
  }

  return rows.sort((a, b) => b.yearTotal - a.yearTotal).slice(0, limit);
}

export function buildRecentTransactionRows(
  transactions: Transaction[],
  period: OverviewPeriod,
  categories: Category[],
  limit = 10,
): RecentTransactionRow[] {
  const ref = referenceDateForPeriod(period);
  const isMonth = period.mode === "month";

  const currentCats = isMonth
    ? spendingByCategory(transactions, {
        period: "month",
        referenceDate: ref,
      })
    : spendingByCategoryInYear(transactions, period.year).map((r) => ({
        category: r.category,
        amount: r.amount,
      }));

  const prevCats = isMonth
    ? spendingByCategory(transactions, {
        period: "month",
        referenceDate: endOfMonth(
          subMonths(new Date(period.month.year, period.month.monthIndex, 1), 1),
        ),
      })
    : spendingByCategoryInYear(transactions, period.year - 1).map((r) => ({
        category: r.category,
        amount: r.amount,
      }));

  const prevMap = new Map(prevCats.map((r) => [r.category, r.amount]));

  const inPeriod = (
    isMonth
      ? transactionsInMonth(transactions, period.month)
      : transactionsInYear(transactions, period.year)
  )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  const catName = (raw: string) => {
    const byId = categories.find((c) => c.id === raw);
    if (byId) return byId.name;
    const byName = categories.find(
      (c) => c.name.toLowerCase() === raw.toLowerCase(),
    );
    if (byName) return byName.name;
    return normalizeReportCategory(raw);
  };

  const recurringKeys = new Set(
    detectRecurringMerchants(transactions).map((r) =>
      r.merchant.toLowerCase(),
    ),
  );

  return inPeriod.map((transaction) => {
    const label = catName(transaction.category);
    const catKey = transaction.category;
    const cur = currentCats.find((c) => c.category === catKey)?.amount ?? 0;
    const changePct = pctChange(cur, prevMap.get(catKey) ?? 0);
    const descLower = transaction.description.toLowerCase();
    const subtitle = recurringKeys.has(descLower.slice(0, 32))
      ? "Recurring payment"
      : label;

    return {
      transaction,
      categoryLabel: label,
      subtitle,
      changePct: transaction.type === "expense" ? changePct : null,
    };
  });
}

export function categoryProgressColor(name: string): string {
  return categoryTheme(name).color;
}

/** @deprecated Use periodSubtitle */
export function monthSubtitle(month: MonthOption): string {
  return periodSubtitle({ mode: "month", month });
}
