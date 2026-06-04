import type { MonthOption, SpendPeriodMode, YearOption } from "../../lib/spend-reports";
import { formatCurrency } from "../../lib/formatters";

type SpendPeriodHeaderProps = {
  periodMode: SpendPeriodMode;
  onPeriodModeChange: (mode: SpendPeriodMode) => void;
  periodLabel: string;
  totalSpending: number;
  currency: string;
  months: MonthOption[];
  selectedMonthKey: string;
  onMonthChange: (key: string) => void;
  years: YearOption[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

export function SpendPeriodHeader({
  periodMode,
  onPeriodModeChange,
  periodLabel,
  totalSpending,
  currency,
  months,
  selectedMonthKey,
  onMonthChange,
  years,
  selectedYear,
  onYearChange,
}: SpendPeriodHeaderProps) {
  return (
    <article className="card spend-period-header">
      <div className="spend-period-header__main">
        <div>
          <p className="spend-period-header__eyebrow">Spending overview</p>
          <div className="spend-period-pills" role="group" aria-label="Report period">
            <button
              type="button"
              className={`spend-period-pill${periodMode === "month" ? " spend-period-pill--active" : ""}`}
              onClick={() => onPeriodModeChange("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`spend-period-pill${periodMode === "year" ? " spend-period-pill--active" : ""}`}
              onClick={() => onPeriodModeChange("year")}
            >
              Year
            </button>
          </div>
          <p className="spend-period-header__range">{periodLabel}</p>
          <p className="help-text">
            {periodMode === "month"
              ? "Category breakdown and transactions for the selected month."
              : "Full-year spending by category for the selected year."}
          </p>
        </div>
        <div className="spend-period-header__total">
          <span className="spend-period-header__total-label">Total spending</span>
          <span className="spend-period-header__total-value">
            {formatCurrency(totalSpending, currency)}
          </span>
        </div>
      </div>
      <div className="spend-period-header__select">
        {periodMode === "month" ? (
          <label className="form-field">
            <span>Month</span>
            <select
              value={selectedMonthKey}
              onChange={(e) => onMonthChange(e.target.value)}
              aria-label="Select month"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="form-field">
            <span>Year</span>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              aria-label="Select year"
            >
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}
