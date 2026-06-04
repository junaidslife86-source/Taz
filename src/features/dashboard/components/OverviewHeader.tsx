import { CalendarIcon } from "../../../lib/category-icons";
import type { MonthOption, OverviewPeriodMode, YearOption } from "../../../lib/overview-metrics";
import { greetingForHour, periodSubtitle } from "../../../lib/overview-metrics";
import type { OverviewPeriod } from "../../../lib/overview-metrics";

type OverviewHeaderProps = {
  period: OverviewPeriod;
  monthOptions: MonthOption[];
  yearOptions: YearOption[];
  onPeriodModeChange: (mode: OverviewPeriodMode) => void;
  onMonthChange: (key: string) => void;
  onYearChange: (year: number) => void;
  displayName?: string;
};

export function OverviewHeader({
  period,
  monthOptions,
  yearOptions,
  onPeriodModeChange,
  onMonthChange,
  onYearChange,
  displayName,
}: OverviewHeaderProps) {
  const greeting = greetingForHour();
  const title = displayName
    ? `${greeting}, ${displayName} 👋`
    : `${greeting} 👋`;

  return (
    <header className="overview-header">
      <div className="overview-header__text">
        <h1 className="overview-header__title">{title}</h1>
        <p className="overview-header__subtitle">{periodSubtitle(period)}</p>
      </div>
      <div className="overview-header__controls">
        <div className="spend-period-pills" role="group" aria-label="Overview period">
          <button
            type="button"
            className={`spend-period-pill${period.mode === "month" ? " spend-period-pill--active" : ""}`}
            onClick={() => onPeriodModeChange("month")}
          >
            Month
          </button>
          <button
            type="button"
            className={`spend-period-pill${period.mode === "year" ? " spend-period-pill--active" : ""}`}
            onClick={() => onPeriodModeChange("year")}
          >
            Year
          </button>
        </div>
        {period.mode === "month" ? (
          <>
            <label className="sr-only" htmlFor="overview-month-select">
              Select month
            </label>
            <select
              id="overview-month-select"
              className="overview-month-select"
              value={period.month.key}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="sr-only" htmlFor="overview-year-select">
              Select year
            </label>
            <select
              id="overview-year-select"
              className="overview-month-select"
              value={period.year}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {yearOptions.map((opt) => (
                <option key={opt.year} value={opt.year}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          type="button"
          className="overview-icon-btn"
          aria-label="Calendar"
          title="Calendar"
        >
          <CalendarIcon size={18} />
        </button>
      </div>
    </header>
  );
}
