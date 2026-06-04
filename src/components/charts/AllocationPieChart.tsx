import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../../lib/formatters";

const CHART_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
  "#be185d",
];

type AllocationPieChartProps = {
  data: { name: string; value: number }[];
  currency: string;
};

export default function AllocationPieChart({
  data,
  currency,
}: AllocationPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, value }) =>
            `${name}: ${formatCurrency(value as number, currency)}`
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Legend />
        <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
