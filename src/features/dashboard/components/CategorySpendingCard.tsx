import { Link } from "react-router-dom";
import { CategoryIcon, TrendDownIcon, TrendUpIcon } from "../../../lib/category-icons";
import { categoryTheme } from "../../../lib/category-theme";
import { formatCurrency } from "../../../lib/formatters";
import type { CategorySpendRow } from "../../../lib/overview-metrics";

type CategorySpendingCardProps = {
  rows: CategorySpendRow[];
  currency: string;
  onCategoryClick?: (name: string) => void;
};

export function CategorySpendingCard({
  rows,
  currency,
  onCategoryClick,
}: CategorySpendingCardProps) {
  const max = rows[0]?.amount ?? 1;

  return (
    <section className="overview-card overview-category-spend">
      <div className="overview-card__header">
        <h2 className="overview-card__title">Spending by Category</h2>
        <Link to="/transactions" className="btn btn-outline btn-sm">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="overview-empty">No spending in this period yet.</p>
      ) : (
        <ul className="overview-category-spend__list">
          {rows.map((row) => {
            const theme = categoryTheme(row.name);
            const changeUp = (row.changePct ?? 0) >= 0;
            const barWidth = Math.max(4, Math.round((row.amount / max) * 100));
            return (
              <li key={row.name}>
                <button
                  type="button"
                  className="overview-category-spend__row"
                  onClick={() => onCategoryClick?.(row.name)}
                >
                  <span
                    className="overview-icon-circle overview-icon-circle--sm"
                    style={{
                      background: theme.bg,
                      color: theme.color,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <CategoryIcon category={row.name} size={16} />
                  </span>
                  <span className="overview-category-spend__main">
                    <span className="overview-category-spend__name">{row.name}</span>
                    <span className="overview-category-spend__bar-track">
                      <span
                        className="overview-category-spend__bar"
                        style={{
                          width: `${barWidth}%`,
                          background: theme.color,
                        }}
                      />
                    </span>
                  </span>
                  <span className="overview-category-spend__meta">
                    <span className="overview-category-spend__amount">
                      {formatCurrency(row.amount, currency)}
                    </span>
                    {row.changePct !== null ? (
                      <span
                        className={`overview-category-spend__change${changeUp ? " text-negative" : " text-positive"}`}
                      >
                        {changeUp ? <TrendUpIcon size={12} /> : <TrendDownIcon size={12} />}
                        {Math.abs(row.changePct)}%
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
