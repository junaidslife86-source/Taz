import { formatCurrency } from "../lib/formatters";

type StatCardProps = {
  label: string;
  value: number;
  currency?: string;
  variant?: "default" | "positive" | "negative" | "neutral";
  hint?: string;
};

export function StatCard({
  label,
  value,
  currency = "AUD",
  variant = "default",
  hint,
}: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{formatCurrency(value, currency)}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
