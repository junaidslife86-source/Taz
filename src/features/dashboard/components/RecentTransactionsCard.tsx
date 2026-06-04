import { Link } from "react-router-dom";
import { CategoryIcon, TrendDownIcon, TrendUpIcon } from "../../../lib/category-icons";
import { categoryTheme } from "../../../lib/category-theme";
import { formatCurrency, formatShortDate } from "../../../lib/formatters";
import type { RecentTransactionRow } from "../../../lib/overview-metrics";

type RecentTransactionsCardProps = {
  rows: RecentTransactionRow[];
  currency: string;
  comparisonLabel?: string;
};

export function RecentTransactionsCard({
  rows,
  currency,
  comparisonLabel = "Compared to last month",
}: RecentTransactionsCardProps) {
  return (
    <section className="overview-card overview-recent-tx">
      <div className="overview-card__header">
        <h2 className="overview-card__title">Recent Transactions</h2>
        <Link to="/transactions" className="btn btn-outline btn-sm">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="overview-empty">No transactions this month.</p>
      ) : (
        <>
          <div className="overview-recent-tx__table-wrap">
            <table className="overview-recent-tx__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>{comparisonLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ transaction, categoryLabel, subtitle, changePct }) => (
                  <TxTableRow
                    key={transaction.id}
                    categoryLabel={categoryLabel}
                    subtitle={subtitle}
                    changePct={changePct}
                    currency={currency}
                    date={transaction.date}
                    description={transaction.description}
                    amount={transaction.amount}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <ul className="overview-recent-tx__cards">
            {rows.map(({ transaction, categoryLabel, subtitle, changePct }) => (
              <li key={transaction.id} className="overview-recent-tx__card">
                <TxMobileRow
                  categoryLabel={categoryLabel}
                  subtitle={subtitle}
                  changePct={changePct}
                  currency={currency}
                  date={transaction.date}
                  description={transaction.description}
                  amount={transaction.amount}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TxTableRow({
  date,
  description,
  categoryLabel,
  subtitle,
  amount,
  changePct,
  currency,
}: {
  date: string;
  description: string;
  categoryLabel: string;
  subtitle: string;
  amount: number;
  changePct: number | null;
  currency: string;
}) {
  const theme = categoryTheme(categoryLabel);
  const positive = amount >= 0;

  return (
    <tr>
      <td>{formatShortDate(date)}</td>
      <td>
        <div className="overview-tx-desc">
          <span
            className="overview-icon-circle overview-icon-circle--sm"
            style={{
              background: theme.bg,
              color: theme.color,
              border: `1px solid ${theme.border}`,
            }}
          >
            <CategoryIcon category={categoryLabel} size={16} />
          </span>
          <span>
            <span className="overview-tx-desc__title">{description}</span>
            <span className="overview-tx-desc__sub">{subtitle}</span>
          </span>
        </div>
      </td>
      <td>
        <span
          className="overview-pill"
          style={{
            color: theme.color,
            background: theme.bg,
            borderColor: theme.border,
          }}
        >
          {categoryLabel}
        </span>
      </td>
      <td className={positive ? "text-positive" : "text-negative"}>
        {formatCurrency(amount, currency)}
      </td>
      <td>
        <ChangeBadge changePct={changePct} />
      </td>
    </tr>
  );
}

function TxMobileRow(props: Parameters<typeof TxTableRow>[0]) {
  const theme = categoryTheme(props.categoryLabel);
  const positive = props.amount >= 0;

  return (
    <div className="overview-recent-tx__card-inner">
      <div className="overview-recent-tx__card-top">
        <span
          className="overview-icon-circle overview-icon-circle--sm"
          style={{
            background: theme.bg,
            color: theme.color,
            border: `1px solid ${theme.border}`,
          }}
        >
          <CategoryIcon category={props.categoryLabel} size={16} />
        </span>
        <div>
          <p className="overview-tx-desc__title">{props.description}</p>
          <p className="overview-tx-desc__sub">{props.subtitle}</p>
        </div>
        <span className={`overview-recent-tx__card-amount${positive ? " text-positive" : " text-negative"}`}>
          {formatCurrency(props.amount, props.currency)}
        </span>
      </div>
      <div className="overview-recent-tx__card-bottom">
        <span className="muted">{formatShortDate(props.date)}</span>
        <span
          className="overview-pill"
          style={{
            color: theme.color,
            background: theme.bg,
            borderColor: theme.border,
          }}
        >
          {props.categoryLabel}
        </span>
        <ChangeBadge changePct={props.changePct} />
      </div>
    </div>
  );
}

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct === null) return <span className="muted">—</span>;
  const up = changePct >= 0;
  return (
    <span className={`overview-change-badge${up ? " text-negative" : " text-positive"}`}>
      {up ? <TrendUpIcon size={12} /> : <TrendDownIcon size={12} />}
      {Math.abs(changePct)}%
    </span>
  );
}
