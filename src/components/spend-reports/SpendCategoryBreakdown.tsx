import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SpendingSlice } from "../../lib/spend-reports";
import { formatCurrency } from "../../lib/formatters";
import { formatCategoryLabel } from "../../lib/category-display";
import type { Category } from "../../types/finance";

type SpendCategoryBreakdownProps = {
  slices: SpendingSlice[];
  total: number;
  currency: string;
  categories: Category[];
  periodMode: "month" | "year";
  selectedCategory: string | null;
  onCategoryClick: (category: string) => void;
};

export function SpendCategoryBreakdown({
  slices,
  total,
  currency,
  categories,
  periodMode,
  selectedCategory,
  onCategoryClick,
}: SpendCategoryBreakdownProps) {
  const chartData = slices.map((s) => ({ name: s.name, value: s.value }));

  return (
    <article className="card spend-category-card">
      <div className="spend-category-card__header">
        <div>
          <h2>Spending breakdown</h2>
          <p className="help-text">
            By category for this {periodMode}. Click a row to filter transactions.
          </p>
        </div>
      </div>

      {slices.length === 0 ? (
        <p className="help-text spend-category-card__empty">No spending this period.</p>
      ) : (
        <div className="spend-category-card__body">
          <div className="spend-category-card__chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                  className="spend-pie--interactive"
                  onClick={(_data, index) => {
                    const slice = slices[index];
                    if (slice) onCategoryClick(slice.name);
                  }}
                >
                  {slices.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke={selectedCategory === entry.name ? "#2563eb" : "#fff"}
                      strokeWidth={selectedCategory === entry.name ? 3 : 2}
                      opacity={
                        selectedCategory && selectedCategory !== entry.name ? 0.35 : 1
                      }
                      className="spend-pie--interactive"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="spend-category-card__center" aria-hidden>
              <span className="spend-category-card__center-count">{slices.length}</span>
              <span className="spend-category-card__center-label">Categories</span>
            </div>
          </div>

          <table className="spend-category-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="spend-category-table__amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice) => {
                const active = selectedCategory === slice.name;
                return (
                  <tr
                    key={slice.name}
                    className={`spend-category-table__row${active ? " spend-category-table__row--active" : ""}`}
                    onClick={() => onCategoryClick(slice.name)}
                  >
                    <td>
                      <span
                        className="spend-category-table__dot"
                        style={{ backgroundColor: slice.color }}
                      />
                      {formatCategoryLabel(slice.name, categories)}
                      <span className="spend-category-table__pct">{slice.percent}%</span>
                    </td>
                    <td className="spend-category-table__amount">
                      {formatCurrency(slice.value, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="spend-category-table__amount">
                  {formatCurrency(total, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </article>
  );
}
