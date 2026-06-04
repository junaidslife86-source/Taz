import { Link } from "react-router-dom";
import { CategoryIcon } from "../../../lib/category-icons";
import { categoryTheme } from "../../../lib/category-theme";
import { formatCurrency } from "../../../lib/formatters";
import type { UpcomingBill } from "../../../lib/overview-metrics";

type UpcomingBillsCardProps = {
  bills: UpcomingBill[];
  currency: string;
};

export function UpcomingBillsCard({ bills, currency }: UpcomingBillsCardProps) {
  return (
    <section className="overview-card overview-bills">
      <div className="overview-card__header">
        <h2 className="overview-card__title">Upcoming Bills</h2>
        <Link to="/transactions" className="btn btn-outline btn-sm">
          View all
        </Link>
      </div>
      <ul className="overview-bills__list">
        {bills.map((bill) => {
          const theme = categoryTheme(bill.category);
          return (
            <li key={bill.id} className="overview-bills__row">
              <span
                className="overview-icon-circle overview-icon-circle--sm"
                style={{
                  background: theme.bg,
                  color: theme.color,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <CategoryIcon category={bill.category} size={16} />
              </span>
              <span className="overview-bills__info">
                <span className="overview-bills__merchant">{bill.merchant}</span>
                <span className="overview-bills__category">{bill.category}</span>
              </span>
              <span className="overview-bills__due">{bill.dueLabel}</span>
              <span className="overview-bills__amount">
                {formatCurrency(bill.amount, currency)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
