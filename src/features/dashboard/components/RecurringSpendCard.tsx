import { Link } from "react-router-dom";
import { CategoryIcon } from "../../../lib/category-icons";
import { categoryTheme } from "../../../lib/category-theme";
import { formatCurrency } from "../../../lib/formatters";
import type { RecurringSpendRow } from "../../../lib/overview-metrics";

type RecurringSpendCardProps = {
  rows: RecurringSpendRow[];
  currency: string;
  year: number;
};

export function RecurringSpendCard({
  rows,
  currency,
  year,
}: RecurringSpendCardProps) {
  return (
    <section className="overview-card overview-bills">
      <div className="overview-card__header">
        <h2 className="overview-card__title">Recurring spend ({year})</h2>
        <Link to="/transactions" className="btn btn-outline btn-sm">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="overview-empty">No recurring charges detected for this year.</p>
      ) : (
        <ul className="overview-bills__list">
          {rows.map((row) => {
            const theme = categoryTheme(row.category);
            return (
              <li key={row.id} className="overview-bills__row">
                <span
                  className="overview-icon-circle overview-icon-circle--sm"
                  style={{
                    background: theme.bg,
                    color: theme.color,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <CategoryIcon category={row.category} size={16} />
                </span>
                <span className="overview-bills__info">
                  <span className="overview-bills__merchant">{row.merchant}</span>
                  <span className="overview-bills__category">{row.category}</span>
                </span>
                <span className="overview-bills__due">{row.frequencyLabel}</span>
                <span className="overview-bills__amount">
                  {formatCurrency(row.yearTotal, currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
