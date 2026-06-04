import { formatCurrency } from "../lib/formatters";
import {
  sumCredits,
  sumDebits,
  type ParseStats,
  type ReconciliationResult,
  type StatementSummary,
} from "../lib/statement-formats/reconciliation";

type StatementReconciliationCardProps = {
  stats: ParseStats;
  summary: StatementSummary;
  reconciliation: ReconciliationResult;
  statementReconciliation: ReconciliationResult;
  transactionAmounts: number[];
  currency?: string;
};

export function StatementReconciliationCard({
  stats,
  summary,
  reconciliation,
  statementReconciliation,
  transactionAmounts,
  currency = "AUD",
}: StatementReconciliationCardProps) {
  const parsedCredits = sumCredits(transactionAmounts);
  const parsedDebits = sumDebits(transactionAmounts);

  const displayRecon = statementReconciliation.isBalanced
    ? statementReconciliation
    : reconciliation;

  const fmt = (n: number | null) =>
    n === null ? "—" : formatCurrency(n, currency);

  return (
    <section className="reconciliation-card">
      <h3>Statement check</h3>

      <div className="reconciliation-grid">
        <div className="reconciliation-stat">
          <span className="reconciliation-label">Raw parsed lines</span>
          <span className="reconciliation-value">{stats.rawParsedLineCount}</span>
        </div>
        <div className="reconciliation-stat">
          <span className="reconciliation-label">Detected transactions</span>
          <span className="reconciliation-value">
            {stats.detectedTransactionCount}
          </span>
        </div>
        <div className="reconciliation-stat">
          <span className="reconciliation-label">Needs review</span>
          <span
            className={`reconciliation-value${stats.needsReviewCount > 0 ? " text-warning" : ""}`}
          >
            {stats.needsReviewCount}
          </span>
        </div>
      </div>

      <div className="reconciliation-details">
        {summary.openingBalance !== null && (
          <p>
            <span>Statement opening balance</span>
            <strong>{fmt(summary.openingBalance)}</strong>
          </p>
        )}
        <p>
          <span>Parsed credits (payments / inflows)</span>
          <strong>{fmt(parsedCredits)}</strong>
        </p>
        <p>
          <span>Parsed debits (purchases / outflows)</span>
          <strong>{fmt(parsedDebits)}</strong>
        </p>
        {summary.closingBalance !== null && (
          <p>
            <span>Expected closing balance</span>
            <strong>{fmt(summary.closingBalance)}</strong>
          </p>
        )}
        {displayRecon.calculatedClosing !== null && (
          <p>
            <span>Calculated closing balance</span>
            <strong>{fmt(displayRecon.calculatedClosing)}</strong>
          </p>
        )}
      </div>

      <div
        className={`reconciliation-status ${displayRecon.isBalanced ? "reconciliation-status--ok" : "reconciliation-status--warn"}`}
      >
        {displayRecon.isBalanced ? (
          <>
            <strong>Statement check passed</strong>
            <span>{displayRecon.formula}</span>
          </>
        ) : (
          <>
            <strong>Statement check needs review</strong>
            <span>
              {displayRecon.difference !== null
                ? `Difference: ${fmt(Math.abs(displayRecon.difference))}. Some transactions may be missing, duplicated, or incorrectly classified.`
                : "Could not fully reconcile — review transactions before importing."}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
