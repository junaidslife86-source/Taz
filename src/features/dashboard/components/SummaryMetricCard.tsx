import { MiniSparkline } from "./MiniSparkline";
import { formatCurrency } from "../../../lib/formatters";
import type { MetricTone } from "../../../lib/overview-metrics";
import { TrendDownIcon, TrendUpIcon } from "../../../lib/category-icons";

const TONE_STYLES: Record<
  MetricTone,
  { iconBg: string; iconColor: string; sparkStroke: string; sparkFill: string }
> = {
  income: {
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    sparkStroke: "#059669",
    sparkFill: "#a7f3d0",
  },
  spent: {
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
    sparkStroke: "#dc2626",
    sparkFill: "#fecaca",
  },
  left: {
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    sparkStroke: "#2563eb",
    sparkFill: "#bfdbfe",
  },
  projected: {
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
    sparkStroke: "#7c3aed",
    sparkFill: "#ddd6fe",
  },
};

type SummaryMetricCardProps = {
  label: string;
  amount: number;
  currency: string;
  changePct: number | null;
  changeLabel?: string;
  statusLabel?: string;
  sparkline: number[];
  tone: MetricTone;
  icon: React.ReactNode;
};

export function SummaryMetricCard({
  label,
  amount,
  currency,
  changePct,
  changeLabel,
  statusLabel,
  sparkline,
  tone,
  icon,
}: SummaryMetricCardProps) {
  const style = TONE_STYLES[tone];
  const showChange = changePct !== null && !statusLabel;
  const changeUp = (changePct ?? 0) >= 0;

  return (
    <article className="overview-summary-card">
      <div className="overview-summary-card__top">
        <div
          className="overview-summary-card__icon"
          style={{ background: style.iconBg, color: style.iconColor }}
        >
          {icon}
        </div>
        <span className="overview-summary-card__label">{label}</span>
      </div>
      <p className="overview-summary-card__amount">
        {formatCurrency(amount, currency)}
      </p>
      {statusLabel ? (
        <p className="overview-summary-card__status">{statusLabel}</p>
      ) : showChange ? (
        <p
          className={`overview-summary-card__change${changeUp ? " overview-summary-card__change--up" : " overview-summary-card__change--down"}`}
        >
          {changeUp ? <TrendUpIcon /> : <TrendDownIcon />}
          <span>
            {Math.abs(changePct!)}% {changeLabel ?? "vs last month"}
          </span>
        </p>
      ) : (
        <p className="overview-summary-card__status muted">No prior period data</p>
      )}
      <MiniSparkline
        values={sparkline}
        stroke={style.sparkStroke}
        fill={style.sparkFill}
      />
    </article>
  );
}
