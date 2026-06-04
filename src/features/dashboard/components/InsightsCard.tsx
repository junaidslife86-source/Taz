import { Link } from "react-router-dom";
import { CategoryIcon, ChevronRightIcon } from "../../../lib/category-icons";
import { categoryTheme } from "../../../lib/category-theme";
import type { InsightRow } from "../../../lib/overview-metrics";

type InsightsCardProps = {
  insights: InsightRow[];
};

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <section className="overview-card overview-insights">
      <h2 className="overview-card__title">Insights</h2>
      <ul className="overview-insights__list">
        {insights.map((row) => {
          const theme = categoryTheme(row.category);
          return (
            <li key={row.id}>
              <Link to="/transactions" className="overview-insights__row">
                <span
                  className="overview-icon-circle"
                  style={{
                    background: theme.bg,
                    color: theme.color,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <CategoryIcon category={row.category} size={18} />
                </span>
                <span className="overview-insights__content">
                  <span className="overview-insights__title">{row.title}</span>
                  <span className="overview-insights__desc">{row.description}</span>
                </span>
                <ChevronRightIcon className="overview-insights__chevron" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
