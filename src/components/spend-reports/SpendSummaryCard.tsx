import type { SpendingSummary } from "../../lib/spend-reports";
import { formatCurrency } from "../../lib/formatters";

type SpendSummaryCardProps = {
  summary: SpendingSummary;
  currency: string;
};

export function SpendSummaryCard({ summary, currency }: SpendSummaryCardProps) {
  const rows = [
    { label: "Transactions", value: String(summary.totalTransactions) },
    {
      label: "Largest",
      value: formatCurrency(summary.largestTransaction, currency),
    },
    {
      label: "Average",
      value: formatCurrency(summary.averageTransaction, currency),
    },
    {
      label: "Total",
      value: formatCurrency(summary.totalSpending, currency),
      highlight: true,
    },
  ];

  return (
    <article className="card spend-summary-card">
      <h2>Period summary</h2>
      <ul className="spend-summary-list">
        {rows.map((row) => (
          <li key={row.label} className="spend-summary-list__item">
            <span>{row.label}</span>
            <span
              className={
                row.highlight ? "spend-summary-list__value--highlight" : undefined
              }
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
