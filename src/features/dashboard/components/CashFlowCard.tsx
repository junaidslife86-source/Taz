import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../../../lib/formatters";
import type { CashFlowPoint } from "../../../lib/overview-metrics";

type CashFlowCardProps = {
  data: CashFlowPoint[];
  currency: string;
  periodLabel: string;
  isYearView?: boolean;
};

function CashFlowChartInner({ data, currency }: { data: CashFlowPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
          }
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
          }}
          formatter={(value, name) => [
            formatCurrency(Number(value ?? 0), currency),
            name === "income" ? "Income" : "Expenses",
          ]}
          labelFormatter={(label) => label}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          formatter={(value) => (value === "income" ? "Income" : "Expenses")}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#059669"
          fill="url(#incomeGrad)"
          strokeWidth={2}
          name="income"
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#dc2626"
          fill="url(#expenseGrad)"
          strokeWidth={2}
          name="expenses"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CashFlowCard({
  data,
  currency,
  periodLabel,
  isYearView = false,
}: CashFlowCardProps) {
  const hasData = useMemo(
    () => data.some((p) => p.income > 0 || p.expenses > 0),
    [data],
  );

  return (
    <section className="overview-card overview-cashflow">
      <div className="overview-card__header">
        <h2 className="overview-card__title">Cash Flow</h2>
        <div className="overview-cashflow__legend" aria-hidden>
          <span className="overview-cashflow__legend-item">
            <span className="overview-cashflow__dot overview-cashflow__dot--income" />
            Income
          </span>
          <span className="overview-cashflow__legend-item">
            <span className="overview-cashflow__dot overview-cashflow__dot--expense" />
            Expenses
          </span>
        </div>
        <span className="overview-cashflow__period muted">{periodLabel}</span>
      </div>
      {!hasData ? (
        <p className="overview-empty">
          Not enough data yet for this {isYearView ? "year" : "month"}.
        </p>
      ) : (
        <CashFlowChartInner data={data} currency={currency} />
      )}
    </section>
  );
}
