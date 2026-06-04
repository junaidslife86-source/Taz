import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../../lib/formatters";

type NetWorthHistoryChartProps = {
  data: { date: string; netWorth: number }[];
  currency: string;
};

export default function NetWorthHistoryChart({
  data,
  currency,
}: NetWorthHistoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v) => formatCurrency(Number(v), currency)}
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
