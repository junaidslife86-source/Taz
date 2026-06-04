import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Transaction } from "../../types/finance";
import {
  buildMomChartData,
  buildYoyChartData,
  defaultSelectedSeriesIds,
  isYoyAvailable,
  listTrendSeries,
  type TrendTimeMode,
} from "../../lib/spend-trend-data";
import { formatCurrency } from "../../lib/formatters";

const YEAR_LINE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#ca8a04",
  "#0891b2",
];

type SpendTrendChartProps = {
  transactions: Transaction[];
  momPeriodKeys?: string[];
  currency: string;
};

function ControlPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="spend-trend-control">
      <span className="spend-trend-control__label">{label}</span>
      <div className="spend-period-pills" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`spend-period-pill${value === opt.value ? " spend-period-pill--active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SpendTrendChart({
  transactions,
  momPeriodKeys,
  currency,
}: SpendTrendChartProps) {
  const [timeMode, setTimeMode] = useState<TrendTimeMode>("mom");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => listTrendSeries(transactions), [transactions]);
  const yoyReady = useMemo(() => isYoyAvailable(transactions), [transactions]);

  useEffect(() => {
    if (selectedIds.length === 0 && series.length > 0) {
      setSelectedIds(defaultSelectedSeriesIds(series));
    }
  }, [series, selectedIds.length]);

  useEffect(() => {
    if (!seriesOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSeriesOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [seriesOpen]);

  const activeIds = useMemo(() => {
    const valid = new Set(series.map((s) => s.id));
    const filtered = selectedIds.filter((id) => valid.has(id));
    return filtered.length ? filtered : defaultSelectedSeriesIds(series);
  }, [selectedIds, series]);

  const momData = useMemo(
    () => buildMomChartData(transactions, activeIds, momPeriodKeys),
    [transactions, activeIds, momPeriodKeys],
  );

  const yoyBundle = useMemo(
    () => buildYoyChartData(transactions, activeIds),
    [transactions, activeIds],
  );

  const momLines = useMemo(
    () =>
      series
        .filter((s) => activeIds.includes(s.id))
        .map((s) => ({ key: s.id, name: s.label, color: s.color })),
    [series, activeIds],
  );

  const yoyLines = useMemo(
    () =>
      yoyBundle.years.map((year, i) => ({
        key: String(year),
        name: String(year),
        color: YEAR_LINE_COLORS[i % YEAR_LINE_COLORS.length]!,
      })),
    [yoyBundle.years],
  );

  const lines = timeMode === "mom" ? momLines : yoyLines;
  const hasChart =
    (timeMode === "mom" ? momData.length : yoyBundle.rows.length) > 0 &&
    lines.length > 0;

  const toggleSeries = (id: string) => {
    const next = new Set(activeIds);
    if (next.has(id)) {
      if (next.size <= 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds([...next]);
  };

  const seriesSummary =
    activeIds.length <= 1
      ? series.find((s) => s.id === activeIds[0])?.label ?? "1 line"
      : `${activeIds.length} categories`;

  return (
    <article className="card spend-trend-card">
      <div className="spend-trend-card__header">
        <div>
          <h2>Spending trends</h2>
          <p className="help-text">
            {timeMode === "mom"
              ? "Month-over-month totals for selected categories"
              : "Year-over-year comparison by calendar month"}
          </p>
        </div>
        <div className="spend-trend-card__controls">
          <ControlPills
            label="Time"
            value={timeMode}
            onChange={setTimeMode}
            options={[
              { value: "mom", label: "MoM" },
              { value: "yoy", label: "YoY" },
            ]}
          />
          <div className="spend-trend-series" ref={panelRef}>
            <span className="spend-trend-control__label">Categories</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm spend-trend-series__btn"
              onClick={() => setSeriesOpen((v) => !v)}
              aria-expanded={seriesOpen}
            >
              {seriesSummary}
            </button>
            {seriesOpen ? (
              <ul className="spend-trend-series__panel">
                {series.map((s) => (
                  <li key={s.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={activeIds.includes(s.id)}
                        onChange={() => toggleSeries(s.id)}
                      />
                      <span
                        className="spend-category-table__dot"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="spend-trend-card__chart">
        {timeMode === "yoy" && !yoyReady ? (
          <p className="help-text spend-trend-card__empty">
            Year-over-year view needs at least 12 months of expense history.
          </p>
        ) : !hasChart ? (
          <p className="help-text spend-trend-card__empty">No expense data to chart yet.</p>
        ) : timeMode === "mom" ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={momData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
              {momLines.length <= 8 ? (
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
              ) : null}
              {momLines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={yoyBundle.rows}
              margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
              {yoyLines.length <= 8 ? (
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
              ) : null}
              {yoyLines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </article>
  );
}
