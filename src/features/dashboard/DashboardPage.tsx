import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { StatCard } from "../../components/StatCard";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { PageLoader } from "../../components/PageLoader";
import { useFinanceStore } from "../../lib/storage";
import {
  totalAssets,
  totalLiabilities,
  netWorth,
  monthlyIncome,
  monthlyExpenses,
  cashBalance,
  investmentBalance,
  spendingByCategory,
  assetAllocation,
} from "../../lib/calculations";
import { formatCurrency, formatShortDate } from "../../lib/formatters";
import { formatCategoryLabel } from "../../lib/category-display";
import type { Transaction } from "../../types/finance";
import { DISCLAIMER } from "../../types/finance";

const SpendingBarChart = lazy(
  () => import("../../components/charts/SpendingBarChart"),
);
const AllocationPieChart = lazy(
  () => import("../../components/charts/AllocationPieChart"),
);

export function DashboardPage() {
  const { transactions, assets, liabilities, categories, settings } =
    useFinanceStore();

  const assetsTotal = totalAssets(assets);
  const liabilitiesTotal = totalLiabilities(liabilities);
  const nw = netWorth(assets, liabilities);
  const income = monthlyIncome(transactions);
  const expenses = monthlyExpenses(transactions);
  const cash = cashBalance(assets);
  const investments = investmentBalance(assets);
  const categorySpending = spendingByCategory(transactions).map((row) => ({
    ...row,
    category: formatCategoryLabel(row.category, categories),
  }));
  const allocation = assetAllocation(assets);

  const latestTransactions = transactions.slice(0, 8);

  const netWorthChartData =
    assets.length > 0 || liabilities.length > 0
      ? [
          { name: "Assets", value: assetsTotal },
          { name: "Liabilities", value: liabilitiesTotal },
        ]
      : [];

  const pieData =
    allocation.length > 0 ? allocation : netWorthChartData;

  return (
    <div className="page">
      <Header
        title="Dashboard"
        subtitle="Your financial overview at a glance"
      />

      <div className="stat-grid">
        <StatCard label="Total assets" value={assetsTotal} variant="positive" />
        <StatCard label="Total liabilities" value={liabilitiesTotal} variant="negative" />
        <StatCard
          label="Net worth"
          value={nw}
          variant={nw >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Monthly income" value={income} variant="positive" />
        <StatCard label="Monthly expenses" value={expenses} variant="negative" />
        <StatCard label="Cash balance" value={cash} />
        <StatCard label="Investments" value={investments} />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <h2>Spending by category</h2>
          {categorySpending.length === 0 ? (
            <EmptyState
              icon="📈"
              title="No spending data yet"
              description="Import a statement or add transactions to see your spending breakdown."
              action={
                <Link to="/import" className="btn btn-primary btn-sm">
                  Import statements
                </Link>
              }
            />
          ) : (
            <Suspense fallback={<PageLoader label="Loading chart…" />}>
              <SpendingBarChart
                data={categorySpending.slice(0, 8)}
                currency={settings.defaultCurrency}
              />
            </Suspense>
          )}
        </section>

        <section className="card">
          <h2>Net worth breakdown</h2>
          {pieData.length === 0 ? (
            <EmptyState
              icon="💼"
              title="No assets or liabilities yet"
              description="Add your assets and liabilities to see your net worth breakdown."
              action={
                <Link to="/assets" className="btn btn-primary btn-sm">
                  Add assets
                </Link>
              }
            />
          ) : (
            <Suspense fallback={<PageLoader label="Loading chart…" />}>
              <AllocationPieChart
                data={pieData}
                currency={settings.defaultCurrency}
              />
            </Suspense>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-header-row">
          <h2>Latest transactions</h2>
          <Link to="/transactions" className="btn btn-secondary btn-sm">
            View all
          </Link>
        </div>
        {latestTransactions.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No transactions yet"
            description="Import a bank statement or add a transaction manually."
            action={
              <Link to="/import" className="btn btn-primary btn-sm">
                Import statements
              </Link>
            }
          />
        ) : (
          <DataTable<Transaction>
            data={latestTransactions}
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
                  <span className={t.amount >= 0 ? "text-positive" : "text-negative"}>
                    {formatCurrency(t.amount, settings.defaultCurrency)}
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
      </section>

      <p className="disclaimer">{DISCLAIMER}</p>
    </div>
  );
}
