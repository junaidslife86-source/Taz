import { lazy, Suspense, useMemo } from "react";
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
  assetAllocation,
  liabilityBreakdown,
} from "../../lib/calculations";
import { formatCurrency, formatDate, titleCase } from "../../lib/formatters";
import type { NetWorthSnapshot } from "../../types/finance";

const AllocationPieChart = lazy(
  () => import("../../components/charts/AllocationPieChart"),
);
const NetWorthHistoryChart = lazy(
  () => import("../../components/charts/NetWorthHistoryChart"),
);

export function NetWorthPage() {
  const {
    assets,
    liabilities,
    netWorthSnapshots,
    settings,
    addSnapshot,
    deleteSnapshot,
  } = useFinanceStore();

  const assetsTotal = totalAssets(assets);
  const liabilitiesTotal = totalLiabilities(liabilities);
  const nw = netWorth(assets, liabilities);
  const allocation = assetAllocation(assets);
  const breakdown = liabilityBreakdown(liabilities);

  const liabilityChartData = useMemo(
    () => breakdown.map((l) => ({ name: l.name, value: l.balance })),
    [breakdown],
  );

  const historyData = useMemo(
    () =>
      [...netWorthSnapshots].reverse().map((s) => ({
        date: formatDate(s.date),
        netWorth: s.netWorth,
      })),
    [netWorthSnapshots],
  );

  const saveSnapshot = async () => {
    await addSnapshot({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      totalAssets: assetsTotal,
      totalLiabilities: liabilitiesTotal,
      netWorth: nw,
    });
  };

  return (
    <div className="page">
      <Header
        title="Net Worth"
        subtitle="Assets minus liabilities"
        action={
          <button type="button" className="btn btn-primary" onClick={saveSnapshot}>
            Save snapshot
          </button>
        }
      />

      <div className="stat-grid stat-grid--3">
        <StatCard label="Total assets" value={assetsTotal} variant="positive" />
        <StatCard label="Total liabilities" value={liabilitiesTotal} variant="negative" />
        <StatCard
          label="Net worth"
          value={nw}
          variant={nw >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <h2>Asset allocation</h2>
          {allocation.length === 0 ? (
            <EmptyState
              title="No assets"
              description="Add assets to see your allocation breakdown."
            />
          ) : (
            <Suspense fallback={<PageLoader label="Loading chart…" />}>
              <AllocationPieChart
                data={allocation}
                currency={settings.defaultCurrency}
              />
            </Suspense>
          )}
        </section>

        <section className="card">
          <h2>Liability breakdown</h2>
          {breakdown.length === 0 ? (
            <EmptyState
              title="No liabilities"
              description="Add liabilities to see your debt breakdown."
            />
          ) : (
            <Suspense fallback={<PageLoader label="Loading chart…" />}>
              <AllocationPieChart
                data={liabilityChartData}
                currency={settings.defaultCurrency}
              />
            </Suspense>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Snapshot history</h2>
        {historyData.length >= 2 && (
          <Suspense fallback={<PageLoader label="Loading chart…" />}>
            <NetWorthHistoryChart
              data={historyData}
              currency={settings.defaultCurrency}
            />
          </Suspense>
        )}

        {netWorthSnapshots.length === 0 ? (
          <EmptyState
            title="No snapshots yet"
            description="Save a snapshot to track how your net worth changes over time."
          />
        ) : (
          <DataTable<NetWorthSnapshot>
            data={netWorthSnapshots}
            keyField="id"
            columns={[
              {
                key: "date",
                header: "Date",
                render: (s) => formatDate(s.date),
              },
              {
                key: "totalAssets",
                header: "Assets",
                render: (s) =>
                  formatCurrency(s.totalAssets, settings.defaultCurrency),
              },
              {
                key: "totalLiabilities",
                header: "Liabilities",
                render: (s) =>
                  formatCurrency(s.totalLiabilities, settings.defaultCurrency),
              },
              {
                key: "netWorth",
                header: "Net worth",
                render: (s) => (
                  <span className={s.netWorth >= 0 ? "text-positive" : "text-negative"}>
                    {formatCurrency(s.netWorth, settings.defaultCurrency)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (s) => (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteSnapshot(s.id)}
                  >
                    Delete
                  </button>
                ),
              },
            ]}
          />
        )}
      </section>

      {(assets.length > 0 || liabilities.length > 0) && (
        <section className="card">
          <h2>Details by type</h2>
          <div className="detail-lists">
            {assets.length > 0 && (
              <div>
                <h3>Assets</h3>
                <ul className="detail-list">
                  {assets.map((a) => (
                    <li key={a.id}>
                      <span>{a.name}</span>
                      <span>{titleCase(a.assetType)}</span>
                      <span>{formatCurrency(a.value, a.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {liabilities.length > 0 && (
              <div>
                <h3>Liabilities</h3>
                <ul className="detail-list">
                  {liabilities.map((l) => (
                    <li key={l.id}>
                      <span>{l.name}</span>
                      <span>{titleCase(l.liabilityType)}</span>
                      <span>
                        {formatCurrency(l.balance, settings.defaultCurrency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
