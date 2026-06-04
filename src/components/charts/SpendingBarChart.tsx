import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../../lib/formatters";

type SpendingBarChartProps = {
  data: { category: string; amount: number }[];
  currency: string;
};

export default function SpendingBarChart({
  data,
  currency,
}: SpendingBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
        <YAxis
          type="category"
          dataKey="category"
          width={120}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(v) => formatCurrency(Number(v), currency)}
        />
        <Bar dataKey="amount" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
