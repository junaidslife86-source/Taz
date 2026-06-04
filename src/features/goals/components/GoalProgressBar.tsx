import { formatPercent } from "../../../lib/formatters";

type GoalProgressBarProps = {
  percent: number;
  status: "complete" | "on_track" | "needs_attention" | "no_plan";
};

export function GoalProgressBar({ percent, status }: GoalProgressBarProps) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="goal-progress" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`goal-progress__fill goal-progress__fill--${status}`}
        style={{ width: `${width}%` }}
      />
      <span className="goal-progress__label">{formatPercent(width)}</span>
    </div>
  );
}
