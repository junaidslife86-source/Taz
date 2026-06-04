import { formatCurrency } from "../../../lib/formatters";
import type { YearPeriodDetails } from "../../../lib/overview-metrics";

type YearSpendDetailsCardProps = {
  details: YearPeriodDetails;
  currency: string;
};

export function YearSpendDetailsCard({
  details,
  currency,
}: YearSpendDetailsCardProps) {
  return (
    <section className="overview-card overview-year-details">
      <div className="overview-card__header">
        <h2 className="overview-card__title">Year at a glance</h2>
        <span className="overview-year-details__range muted">{details.periodLabel}</span>
      </div>
      <div className="overview-year-details__grid">
        <div className="overview-year-details__stat">
          <span className="overview-year-details__label">Total income</span>
          <span className="overview-year-details__value text-positive">
            {formatCurrency(details.totalIncome, currency)}
          </span>
        </div>
        <div className="overview-year-details__stat">
          <span className="overview-year-details__label">Total spending</span>
          <span className="overview-year-details__value text-negative">
            {formatCurrency(details.totalSpending, currency)}
          </span>
        </div>
        <div className="overview-year-details__stat">
          <span className="overview-year-details__label">Transactions</span>
          <span className="overview-year-details__value">
            {details.totalTransactions.toLocaleString()}
          </span>
        </div>
        <div className="overview-year-details__stat">
          <span className="overview-year-details__label">Largest expense</span>
          <span className="overview-year-details__value">
            {formatCurrency(details.largestTransaction, currency)}
          </span>
        </div>
        <div className="overview-year-details__stat">
          <span className="overview-year-details__label">Average expense</span>
          <span className="overview-year-details__value">
            {formatCurrency(details.averageTransaction, currency)}
          </span>
        </div>
        <div className="overview-year-details__stat">
          <span className="overview-year-details__label">Net (income − spent)</span>
          <span
            className={`overview-year-details__value${details.netSurplus >= 0 ? " text-positive" : " text-negative"}`}
          >
            {formatCurrency(details.netSurplus, currency)}
          </span>
        </div>
      </div>
    </section>
  );
}
