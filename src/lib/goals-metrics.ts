import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Asset, Goal, GoalEntry, Liability, Transaction } from "../types/finance";

export type GoalTrackStatus = "complete" | "on_track" | "needs_attention" | "no_plan";

export type GoalProgress = {
  savedSoFar: number;
  remaining: number;
  percent: number;
  status: GoalTrackStatus;
  statusLabel: string;
  expectedByNow: number;
  monthsElapsed: number;
  monthsRemaining: number | null;
  fromLinkedAccounts: number;
  fromManualEntries: number;
  fromLinkedTransactions: number;
};

export function goalKindLabel(kind: Goal["kind"]): string {
  return kind === "savings" ? "Save for something" : "Pay down debt";
}

export function progressLabel(kind: Goal["kind"]): string {
  return kind === "savings" ? "Saved so far" : "Paid so far";
}

/** Expense transactions (negative amounts) count as money toward the goal */
export function transactionContribution(amount: number): number {
  return amount < 0 ? Math.abs(amount) : 0;
}

function manualEntriesNet(entries: GoalEntry[]): number {
  return entries.reduce((sum, entry) => {
    const sign = entry.kind === "contribution" ? 1 : -1;
    return sum + sign * entry.amount;
  }, 0);
}

function linkedTransactionsTotal(
  goal: Goal,
  transactions: Transaction[],
): number {
  return transactions
    .filter((t) => goal.linkedTransactionIds.includes(t.id))
    .reduce((sum, t) => sum + transactionContribution(t.amount), 0);
}

function linkedAccountsAmount(
  goal: Goal,
  assets: Asset[],
  liabilities: Liability[],
): number {
  if (goal.kind === "savings") {
    return assets
      .filter((a) => goal.linkedAssetIds.includes(a.id))
      .reduce((sum, a) => sum + a.value, 0);
  }

  const linked = liabilities.filter((l) =>
    goal.linkedLiabilityIds.includes(l.id),
  );
  if (linked.length === 0) return 0;

  const currentBalance = linked.reduce((sum, l) => sum + l.balance, 0);
  return Math.max(0, goal.baselineAmount - currentBalance);
}

export function computeGoalProgress(
  goal: Goal,
  entries: GoalEntry[],
  assets: Asset[],
  liabilities: Liability[],
  transactions: Transaction[],
  asOf: Date = new Date(),
): GoalProgress {
  const goalEntries = entries.filter((e) => e.goalId === goal.id);
  const fromManualEntries = manualEntriesNet(goalEntries);
  const fromLinkedTransactions = linkedTransactionsTotal(goal, transactions);
  const fromLinkedAccounts = linkedAccountsAmount(goal, assets, liabilities);

  const baseline =
    goal.kind === "savings" && goal.linkedAssetIds.length > 0
      ? 0
      : goal.baselineAmount;

  const savedSoFar = Math.max(
    0,
    baseline + fromLinkedAccounts + fromManualEntries + fromLinkedTransactions,
  );

  const remaining = Math.max(0, goal.targetAmount - savedSoFar);
  const percent =
    goal.targetAmount > 0
      ? Math.min(100, (savedSoFar / goal.targetAmount) * 100)
      : 0;

  const created = startOfDay(parseISO(goal.createdAt.slice(0, 10)));
  const today = startOfDay(asOf);
  const monthsElapsed = Math.max(
    0,
    differenceInCalendarMonths(today, created),
  );

  let monthsRemaining: number | null = null;
  if (goal.targetDate) {
    const target = startOfDay(parseISO(goal.targetDate));
    monthsRemaining = Math.max(0, differenceInCalendarMonths(target, today));
  }

  const expectedByNow =
    goal.monthlyPlan > 0 ? goal.monthlyPlan * Math.max(1, monthsElapsed) : 0;

  let status: GoalTrackStatus;
  let statusLabel: string;

  if (savedSoFar >= goal.targetAmount) {
    status = "complete";
    statusLabel = "Goal reached";
  } else if (goal.monthlyPlan <= 0 && !goal.targetDate) {
    status = "no_plan";
    statusLabel = "Add a monthly plan or target date";
  } else if (goal.targetDate) {
    const target = startOfDay(parseISO(goal.targetDate));
    const totalDays = Math.max(1, differenceInCalendarDays(target, created));
    const elapsedDays = Math.max(0, differenceInCalendarDays(today, created));
    const paceRatio = elapsedDays / totalDays;
    const expectedByDate = goal.targetAmount * paceRatio;
    if (savedSoFar >= expectedByDate * 0.92) {
      status = "on_track";
      statusLabel = "On track";
    } else {
      status = "needs_attention";
      statusLabel = "Needs attention";
    }
  } else if (savedSoFar >= expectedByNow * 0.92) {
    status = "on_track";
    statusLabel = "On track";
  } else {
    status = "needs_attention";
    statusLabel = "Needs attention";
  }

  return {
    savedSoFar,
    remaining,
    percent,
    status,
    statusLabel,
    expectedByNow,
    monthsElapsed,
    monthsRemaining,
    fromLinkedAccounts,
    fromManualEntries,
    fromLinkedTransactions,
  };
}
