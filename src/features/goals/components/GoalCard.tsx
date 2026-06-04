import { useMemo, useState } from "react";
import { formatCurrency, formatDate, formatShortDate } from "../../../lib/formatters";
import {
  computeGoalProgress,
  goalKindLabel,
  progressLabel,
  type GoalProgress,
} from "../../../lib/goals-metrics";
import type { Asset, Goal, GoalEntry, Liability, Transaction } from "../../../types/finance";
import { GoalProgressBar } from "./GoalProgressBar";

type GoalCardProps = {
  goal: Goal;
  entries: GoalEntry[];
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onAddEntry: (entry: Omit<GoalEntry, "id" | "createdAt">) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
};

export function GoalCard({
  goal,
  entries,
  assets,
  liabilities,
  transactions,
  currency,
  onEdit,
  onDelete,
  onAddEntry,
  onDeleteEntry,
  onUpdateGoal,
}: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryKind, setEntryKind] = useState<"contribution" | "withdrawal">("contribution");
  const [entryNote, setEntryNote] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState("");

  const progress: GoalProgress = useMemo(
    () => computeGoalProgress(goal, entries, assets, liabilities, transactions),
    [goal, entries, assets, liabilities, transactions],
  );

  const goalEntries = entries.filter((e) => e.goalId === goal.id);

  const linkedTx = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions
      .filter((t) => !q || t.description.toLowerCase().includes(q))
      .slice(0, 40);
  }, [transactions, txSearch]);

  const toggleTransaction = async (txId: string) => {
    const ids = new Set(goal.linkedTransactionIds);
    if (ids.has(txId)) ids.delete(txId);
    else ids.add(txId);
    await onUpdateGoal({
      ...goal,
      linkedTransactionIds: [...ids],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);
    const amount = parseFloat(entryAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setEntryError("Enter an amount greater than zero");
      return;
    }
    await onAddEntry({
      goalId: goal.id,
      date: entryDate,
      amount,
      kind: entryKind,
      note: entryNote.trim() || undefined,
    });
    setEntryAmount("");
    setEntryNote("");
  };

  return (
    <article className={`card goal-card goal-card--${progress.status}`}>
      <div className="goal-card__header">
        <div className="goal-card__title-row">
          <div>
            <p className="goal-card__kind">{goalKindLabel(goal.kind)}</p>
            <h2 className="goal-card__name">{goal.name}</h2>
          </div>
          <span className={`goal-status goal-status--${progress.status}`}>
            {progress.statusLabel}
          </span>
        </div>
        <GoalProgressBar percent={progress.percent} status={progress.status} />
        <div className="goal-card__metrics">
          <div>
            <span className="goal-card__metric-label">{progressLabel(goal.kind)}</span>
            <strong>{formatCurrency(progress.savedSoFar, currency)}</strong>
          </div>
          <div>
            <span className="goal-card__metric-label">Target amount</span>
            <strong>{formatCurrency(goal.targetAmount, currency)}</strong>
          </div>
          <div>
            <span className="goal-card__metric-label">Monthly plan</span>
            <strong>
              {goal.monthlyPlan > 0
                ? formatCurrency(goal.monthlyPlan, currency)
                : "—"}
            </strong>
          </div>
          {goal.targetDate && (
            <div>
              <span className="goal-card__metric-label">Target date</span>
              <strong>{formatDate(goal.targetDate)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="goal-card__actions">
        <button type="button" className="btn btn-secondary" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide details" : "Manage goal"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>

      {expanded && (
        <div className="goal-card__details">
          <p className="help-text goal-card__breakdown">
            Progress includes linked account balances, manual entries, and linked transactions
            (expenses count toward the goal).
          </p>
          <ul className="goal-breakdown-list">
            <li>
              Linked accounts: {formatCurrency(progress.fromLinkedAccounts, currency)}
            </li>
            <li>
              Manual entries: {formatCurrency(progress.fromManualEntries, currency)}
            </li>
            <li>
              Linked transactions:{" "}
              {formatCurrency(progress.fromLinkedTransactions, currency)}
            </li>
          </ul>

          <section className="goal-card__section">
            <h3>Add money movement</h3>
            <form className="form-grid goal-entry-form" onSubmit={handleAddEntry}>
              <label className="form-field">
                <span>Date</span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Type</span>
                <select
                  value={entryKind}
                  onChange={(e) =>
                    setEntryKind(e.target.value as "contribution" | "withdrawal")
                  }
                >
                  <option value="contribution">Contribution</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </label>
              <label className="form-field">
                <span>Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="form-field form-field--wide">
                <span>Note (optional)</span>
                <input
                  type="text"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                />
              </label>
              {entryError && <p className="alert-error">{entryError}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Add entry
                </button>
              </div>
            </form>
            {goalEntries.length > 0 && (
              <ul className="goal-entry-list">
                {goalEntries.map((entry) => (
                  <li key={entry.id}>
                    <span>
                      {formatShortDate(entry.date)} ·{" "}
                      {entry.kind === "contribution" ? "+" : "−"}
                      {formatCurrency(entry.amount, currency)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onDeleteEntry(entry.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="goal-card__section">
            <h3>Link transactions</h3>
            <input
              type="search"
              className="filter-input"
              placeholder="Search transactions…"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
            />
            <ul className="goal-tx-list">
              {linkedTx.map((tx) => {
                const checked = goal.linkedTransactionIds.includes(tx.id);
                return (
                  <li key={tx.id}>
                    <label className="goal-tx-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTransaction(tx.id)}
                      />
                      <span>
                        {formatShortDate(tx.date)} {tx.description} ·{" "}
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </article>
  );
}
