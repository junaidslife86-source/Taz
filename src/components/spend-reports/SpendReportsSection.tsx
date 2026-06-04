import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../DataTable";
import { EmptyState } from "../EmptyState";
import { PageLoader } from "../PageLoader";
import { SpendPeriodHeader } from "./SpendPeriodHeader";
import { SpendCategoryBreakdown } from "./SpendCategoryBreakdown";
import { SpendSummaryCard } from "./SpendSummaryCard";
import {
  computeSpendingByCategory,
  computeSpendingSummary,
  filterExpensesForMonth,
  filterExpensesForYear,
  listMonthOptionsFromTransactions,
  listYearOptionsFromTransactions,
  monthDateRangeLabel,
  yearDateRangeLabel,
  type SpendPeriodMode,
} from "../../lib/spend-reports";
import {
  enumerateTrailingMonthKeys,
  enumerateYearMonthKeys,
  filterTransactionsForTrendWindow,
} from "../../lib/spend-trend-data";
import { formatCategoryLabel } from "../../lib/category-display";
import { formatCurrency, formatShortDate } from "../../lib/formatters";
import type { Category, Transaction } from "../../types/finance";

const SpendTrendChart = lazy(
  () => import("../charts/SpendTrendChart"),
);

type SpendReportsSectionProps = {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
};

export function SpendReportsSection({
  transactions,
  categories,
  currency,
}: SpendReportsSectionProps) {
  const transactionsRef = useRef<HTMLDivElement>(null);

  const months = useMemo(
    () => listMonthOptionsFromTransactions(transactions),
    [transactions],
  );
  const years = useMemo(
    () => listYearOptionsFromTransactions(transactions),
    [transactions],
  );

  const defaultMonthKey = months.length ? months[months.length - 1]!.key : "";
  const defaultYear = years.length ? years[years.length - 1]!.year : new Date().getFullYear();

  const [periodMode, setPeriodMode] = useState<SpendPeriodMode>("month");
  const [monthKey, setMonthKey] = useState(defaultMonthKey);
  const [year, setYear] = useState(defaultYear);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const activeMonth = useMemo(() => {
    const key = monthKey || defaultMonthKey;
    return months.find((m) => m.key === key) ?? months[months.length - 1] ?? null;
  }, [months, monthKey, defaultMonthKey]);

  const activeYear = useMemo(() => {
    return years.find((y) => y.year === year)?.year ?? defaultYear;
  }, [years, year, defaultYear]);

  const periodExpenses = useMemo(() => {
    if (periodMode === "year") {
      return filterExpensesForYear(transactions, activeYear);
    }
    if (!activeMonth) return [];
    return filterExpensesForMonth(transactions, activeMonth);
  }, [transactions, periodMode, activeMonth, activeYear]);

  const spending = useMemo(
    () => computeSpendingByCategory(periodExpenses),
    [periodExpenses],
  );

  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return periodExpenses;
    return periodExpenses.filter((t) => t.category === selectedCategory);
  }, [periodExpenses, selectedCategory]);

  const summary = useMemo(
    () => computeSpendingSummary(filteredExpenses),
    [filteredExpenses],
  );

  const periodLabel = useMemo(() => {
    if (periodMode === "year") return yearDateRangeLabel(activeYear);
    return activeMonth ? monthDateRangeLabel(activeMonth) : "";
  }, [periodMode, activeYear, activeMonth]);

  const trendMonthKeys = useMemo(() => {
    if (periodMode === "year") {
      return enumerateYearMonthKeys(activeYear);
    }
    if (!activeMonth) return [];
    return enumerateTrailingMonthKeys(activeMonth.key, 12);
  }, [periodMode, activeYear, activeMonth]);

  const trendTransactions = useMemo(
    () => filterTransactionsForTrendWindow(transactions, trendMonthKeys),
    [transactions, trendMonthKeys],
  );

  const handlePeriodModeChange = useCallback((mode: SpendPeriodMode) => {
    setPeriodMode(mode);
    setSelectedCategory(null);
  }, []);

  const handleMonthChange = useCallback((key: string) => {
    setMonthKey(key);
    setSelectedCategory(null);
  }, []);

  const handleYearChange = useCallback((y: number) => {
    setYear(y);
    setSelectedCategory(null);
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
    requestAnimationFrame(() => {
      transactionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const hasExpenseData = months.some((m) => m.key) && transactions.some((t) => t.type === "expense");

  if (!hasExpenseData) {
    return (
      <section className="card spend-reports-empty">
        <EmptyState
          icon="📊"
          title="Month & year spending"
          description="Import statements or add expense transactions to unlock month and year spending views."
          action={
            <Link to="/import" className="btn btn-primary btn-sm">
              Import statements
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="spend-reports-section" aria-labelledby="spend-reports-heading">
      <h2 id="spend-reports-heading" className="spend-reports-section__title">
        Month &amp; year spending
      </h2>

      <SpendPeriodHeader
        periodMode={periodMode}
        onPeriodModeChange={handlePeriodModeChange}
        periodLabel={periodLabel}
        totalSpending={spending.total}
        currency={currency}
        months={months}
        selectedMonthKey={activeMonth?.key ?? defaultMonthKey}
        onMonthChange={handleMonthChange}
        years={years}
        selectedYear={activeYear}
        onYearChange={handleYearChange}
      />

      <Suspense fallback={<PageLoader label="Loading trends…" />}>
        <SpendTrendChart
          transactions={trendTransactions}
          momPeriodKeys={trendMonthKeys}
          currency={currency}
        />
      </Suspense>

      <div className="spend-reports-grid">
        <SpendCategoryBreakdown
          slices={spending.slices}
          total={spending.total}
          currency={currency}
          categories={categories}
          periodMode={periodMode}
          selectedCategory={selectedCategory}
          onCategoryClick={handleCategoryClick}
        />

        <div ref={transactionsRef} className="spend-reports-grid__transactions">
          <section className="card">
            <div className="card-header-row">
              <div>
                <h2>Transactions</h2>
                {selectedCategory ? (
                  <p className="help-text">
                    Filtered: {formatCategoryLabel(selectedCategory, categories)}{" "}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedCategory(null)}
                    >
                      Clear
                    </button>
                  </p>
                ) : (
                  <p className="help-text">All expenses in this period</p>
                )}
              </div>
              <Link to="/transactions" className="btn btn-secondary btn-sm">
                View all
              </Link>
            </div>
            {filteredExpenses.length === 0 ? (
              <p className="help-text">No transactions match this view.</p>
            ) : (
              <DataTable<Transaction>
                data={filteredExpenses.slice(0, 50)}
                keyField="id"
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    render: (t) => formatShortDate(t.date),
                  },
                  { key: "description", header: "Description" },
                  {
                    key: "amount",
                    header: "Amount",
                    render: (t) => (
                      <span className="text-negative">
                        {formatCurrency(Math.abs(t.amount), currency)}
                      </span>
                    ),
                  },
                  {
                    key: "category",
                    header: "Category",
                    render: (t) => formatCategoryLabel(t.category, categories),
                  },
                ]}
              />
            )}
            {filteredExpenses.length > 50 ? (
              <p className="help-text">
                Showing 50 of {filteredExpenses.length} transactions.
              </p>
            ) : null}
          </section>
        </div>

        <SpendSummaryCard summary={summary} currency={currency} />
      </div>
    </section>
  );
}
