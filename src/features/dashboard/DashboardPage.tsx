import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { PageLoader } from "../../components/PageLoader";
import { useFinanceStore } from "../../lib/storage";
import { formatCategoryLabel } from "../../lib/category-display";
import type { Category } from "../../types/finance";
import { DISCLAIMER } from "../../types/finance";
import {
  buildCashFlowSeries,
  buildCategorySpendRows,
  buildInsights,
  buildOverviewSummary,
  buildRecentTransactionRows,
  buildRecurringSpendForYear,
  buildUpcomingBills,
  buildYearPeriodDetails,
  comparisonLabel,
  listMonthOptionsFromTransactions,
  listYearOptionsFromTransactions,
  type MonthOption,
  type OverviewPeriod,
  type OverviewPeriodMode,
} from "../../lib/overview-metrics";
import {
  enumerateTrailingMonthKeys,
  enumerateYearMonthKeys,
  filterTransactionsForTrendWindow,
} from "../../lib/spend-trend-data";
import { OverviewHeader } from "./components/OverviewHeader";
import { SummaryMetricCard } from "./components/SummaryMetricCard";
import { InsightsCard } from "./components/InsightsCard";
import { CategorySpendingCard } from "./components/CategorySpendingCard";
import { CashFlowCard } from "./components/CashFlowCard";
import { UpcomingBillsCard } from "./components/UpcomingBillsCard";
import { RecentTransactionsCard } from "./components/RecentTransactionsCard";
import { YearSpendDetailsCard } from "./components/YearSpendDetailsCard";
import { RecurringSpendCard } from "./components/RecurringSpendCard";

const SpendTrendChart = lazy(
  () => import("../../components/charts/SpendTrendChart"),
);

function resolveCategoryFilter(name: string, categories: Category[]): string {
  const match = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.name ?? name;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { transactions, assets, categories, settings } = useFinanceStore();

  const monthOptions = useMemo(
    () => listMonthOptionsFromTransactions(transactions),
    [transactions],
  );
  const yearOptions = useMemo(
    () => listYearOptionsFromTransactions(transactions),
    [transactions],
  );

  const [periodMode, setPeriodMode] = useState<OverviewPeriodMode>("month");
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const selectedMonth: MonthOption = useMemo(() => {
    const fallback = monthOptions[monthOptions.length - 1]!;
    if (!monthKey) return fallback;
    return monthOptions.find((m) => m.key === monthKey) ?? fallback;
  }, [monthOptions, monthKey]);

  const selectedYear = useMemo(() => {
    const fallback = yearOptions[yearOptions.length - 1]?.year ?? new Date().getFullYear();
    if (year === null) return fallback;
    return yearOptions.find((y) => y.year === year)?.year ?? fallback;
  }, [yearOptions, year]);

  const period: OverviewPeriod = useMemo(
    () =>
      periodMode === "month"
        ? { mode: "month", month: selectedMonth }
        : { mode: "year", year: selectedYear },
    [periodMode, selectedMonth, selectedYear],
  );

  const compareLabel = comparisonLabel(period);

  const summary = useMemo(
    () => buildOverviewSummary(transactions, assets, period),
    [transactions, assets, period],
  );

  const yearDetails = useMemo(
    () =>
      period.mode === "year"
        ? buildYearPeriodDetails(transactions, period.year)
        : null,
    [transactions, period],
  );

  const categoryRows = useMemo(
    () =>
      buildCategorySpendRows(transactions, period).map((row) => ({
        ...row,
        name: formatCategoryLabel(row.name, categories),
      })),
    [transactions, period, categories],
  );

  const insights = useMemo(
    () => buildInsights(transactions, period, summary),
    [transactions, period, summary],
  );

  const cashFlow = useMemo(
    () => buildCashFlowSeries(transactions, period),
    [transactions, period],
  );

  const bills = useMemo(
    () =>
      period.mode === "month"
        ? buildUpcomingBills(transactions, period.month).map((b) => ({
            ...b,
            category: formatCategoryLabel(b.category, categories),
          }))
        : [],
    [transactions, period, categories],
  );

  const recurringYear = useMemo(
    () =>
      period.mode === "year"
        ? buildRecurringSpendForYear(transactions, period.year).map((r) => ({
            ...r,
            category: formatCategoryLabel(r.category, categories),
          }))
        : [],
    [transactions, period, categories],
  );

  const recentRows = useMemo(() => {
    const rows = buildRecentTransactionRows(transactions, period, categories, 12);
    return rows.map((r) => ({
      ...r,
      categoryLabel: formatCategoryLabel(r.categoryLabel, categories),
    }));
  }, [transactions, period, categories]);

  const trendMonthKeys = useMemo(() => {
    if (period.mode === "year") {
      return enumerateYearMonthKeys(period.year);
    }
    return enumerateTrailingMonthKeys(selectedMonth.key, 12);
  }, [period, selectedMonth.key]);

  const trendTransactions = useMemo(
    () => filterTransactionsForTrendWindow(transactions, trendMonthKeys),
    [transactions, trendMonthKeys],
  );

  const hasAnyData = transactions.length > 0 || assets.length > 0;
  const isYear = period.mode === "year";

  const handleCategoryClick = (name: string) => {
    navigate("/transactions", {
      state: { categoryFilter: resolveCategoryFilter(name, categories) },
    });
  };

  const periodSelectLabel =
    period.mode === "month" ? selectedMonth.label : String(selectedYear);

  return (
    <div className="page overview-page">
      <OverviewHeader
        period={period}
        monthOptions={monthOptions}
        yearOptions={yearOptions}
        onPeriodModeChange={setPeriodMode}
        onMonthChange={setMonthKey}
        onYearChange={setYear}
      />

      {!hasAnyData ? (
        <EmptyState
          icon="📊"
          title="Welcome to your overview"
          description="Import a statement or add transactions to see income, spending, and insights."
          action={
            <Link to="/import" className="btn btn-primary">
              Import statements
            </Link>
          }
        />
      ) : (
        <>
          <div className="overview-summary-grid">
            <SummaryMetricCard
              label="Income"
              amount={summary.income}
              currency={settings.defaultCurrency}
              changePct={summary.incomeChangePct}
              changeLabel={compareLabel}
              sparkline={summary.incomeSparkline}
              tone="income"
              icon={<IncomeIcon />}
            />
            <SummaryMetricCard
              label="Spent"
              amount={summary.spent}
              currency={settings.defaultCurrency}
              changePct={summary.spentChangePct}
              changeLabel={compareLabel}
              sparkline={summary.spentSparkline}
              tone="spent"
              icon={<SpentIcon />}
            />
            <SummaryMetricCard
              label={isYear ? "Net (income − spent)" : "Left to Spend"}
              amount={summary.leftToSpend}
              currency={settings.defaultCurrency}
              changePct={summary.leftChangePct}
              changeLabel={compareLabel}
              sparkline={summary.leftSparkline}
              tone="left"
              icon={<WalletIcon />}
            />
            <SummaryMetricCard
              label={isYear ? "Year surplus (projected)" : "Projected End Balance"}
              amount={summary.projectedEndBalance}
              currency={settings.defaultCurrency}
              changePct={null}
              statusLabel={summary.projectedLabel}
              sparkline={summary.projectedSparkline}
              tone="projected"
              icon={<CalendarBalanceIcon />}
            />
          </div>

          {yearDetails ? (
            <YearSpendDetailsCard
              details={yearDetails}
              currency={settings.defaultCurrency}
            />
          ) : null}

          {isYear ? (
            <section className="overview-card overview-year-trend">
              <div className="overview-card__header">
                <h2 className="overview-card__title">Spending trend ({selectedYear})</h2>
                <p className="muted overview-year-trend__hint">
                  Month-by-month expenses for the full year
                </p>
              </div>
              <Suspense fallback={<PageLoader label="Loading trend…" />}>
                <SpendTrendChart
                  transactions={trendTransactions}
                  momPeriodKeys={trendMonthKeys}
                  currency={settings.defaultCurrency}
                />
              </Suspense>
            </section>
          ) : null}

          <div className="overview-grid overview-grid--insights">
            <InsightsCard insights={insights} />
            <CategorySpendingCard
              rows={categoryRows}
              currency={settings.defaultCurrency}
              onCategoryClick={handleCategoryClick}
            />
          </div>

          <div className="overview-grid overview-grid--charts">
            <CashFlowCard
              data={cashFlow}
              currency={settings.defaultCurrency}
              periodLabel={periodSelectLabel}
              isYearView={isYear}
            />
            {isYear ? (
              <RecurringSpendCard
                rows={recurringYear}
                currency={settings.defaultCurrency}
                year={selectedYear}
              />
            ) : (
              <UpcomingBillsCard
                bills={bills}
                currency={settings.defaultCurrency}
              />
            )}
          </div>

          <RecentTransactionsCard
            rows={recentRows}
            currency={settings.defaultCurrency}
            comparisonLabel={
              isYear ? "Category vs last year" : "Compared to last month"
            }
          />
        </>
      )}

      <p className="disclaimer">{DISCLAIMER}</p>
    </div>
  );
}

function IncomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="12" x2="12" y1="19" y2="5" />
      <polyline points="19 12 12 5 5 12" />
    </svg>
  );
}

function SpentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="12" x2="12" y1="5" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

function CalendarBalanceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}
