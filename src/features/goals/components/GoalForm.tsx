import type { Asset, Goal, GoalKind, Liability } from "../../../types/finance";
import { goalSchema } from "../../../lib/validation";

export type GoalFormState = {
  name: string;
  kind: GoalKind;
  targetAmount: string;
  baselineAmount: string;
  monthlyPlan: string;
  targetDate: string;
  linkedAssetIds: string[];
  linkedLiabilityIds: string[];
  notes: string;
};

type GoalFormProps = {
  form: GoalFormState;
  editing: Goal | null;
  assets: Asset[];
  liabilities: Liability[];
  error: string | null;
  onChange: (form: GoalFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function GoalForm({
  form,
  editing,
  assets,
  liabilities,
  error,
  onChange,
  onSubmit,
  onCancel,
}: GoalFormProps) {
  const isSavings = form.kind === "savings";
  const baselineLabel = isSavings ? "Saved so far" : "Already paid off";
  const targetHelp = isSavings
    ? "How much you want to save in total"
    : "How much debt you want to pay off";

  const toggleId = (field: "linkedAssetIds" | "linkedLiabilityIds", id: string) => {
    const current = form[field];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onChange({ ...form, [field]: next });
  };

  return (
    <section className="card">
      <h2>{editing ? "Edit goal" : isSavings ? "Save for something" : "Pay down debt"}</h2>
      <form className="form-grid" onSubmit={onSubmit}>
        {!editing && (
          <label className="form-field form-field--wide">
            <span>Goal type</span>
            <select
              value={form.kind}
              onChange={(e) =>
                onChange({ ...form, kind: e.target.value as GoalKind })
              }
            >
              <option value="savings">Save for something</option>
              <option value="debt">Pay down debt</option>
            </select>
          </label>
        )}

        <label className="form-field form-field--wide">
          <span>Goal name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder={isSavings ? "e.g. Emergency fund" : "e.g. Credit card"}
          />
        </label>

        <label className="form-field">
          <span>Target amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.targetAmount}
            onChange={(e) => onChange({ ...form, targetAmount: e.target.value })}
          />
          <span className="help-text">{targetHelp}</span>
        </label>

        <label className="form-field">
          <span>{baselineLabel}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.baselineAmount}
            onChange={(e) => onChange({ ...form, baselineAmount: e.target.value })}
          />
          <span className="help-text">
            {isSavings
              ? "Money already set aside (before linked accounts)"
              : "Debt already paid, or total balance when you linked accounts"}
          </span>
        </label>

        <label className="form-field">
          <span>Monthly plan</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.monthlyPlan}
            onChange={(e) => onChange({ ...form, monthlyPlan: e.target.value })}
          />
          <span className="help-text">How much you plan to add each month</span>
        </label>

        <label className="form-field">
          <span>Target date</span>
          <input
            type="date"
            value={form.targetDate}
            onChange={(e) => onChange({ ...form, targetDate: e.target.value })}
          />
          <span className="help-text">Optional — used for on-track status</span>
        </label>

        {isSavings && assets.length > 0 && (
          <fieldset className="form-field form-field--wide goal-link-fieldset">
            <legend>Link assets</legend>
            <p className="help-text">Balances from these assets count toward your goal.</p>
            <ul className="goal-link-list">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.linkedAssetIds.includes(asset.id)}
                      onChange={() => toggleId("linkedAssetIds", asset.id)}
                    />
                    {asset.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {!isSavings && liabilities.length > 0 && (
          <fieldset className="form-field form-field--wide goal-link-fieldset">
            <legend>Link liabilities</legend>
            <p className="help-text">
              Paydown is tracked from linked balances. Set “Already paid off” to the
              total balance when you linked accounts.
            </p>
            <ul className="goal-link-list">
              {liabilities.map((liability) => (
                <li key={liability.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.linkedLiabilityIds.includes(liability.id)}
                      onChange={() => toggleId("linkedLiabilityIds", liability.id)}
                    />
                    {liability.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <label className="form-field form-field--wide">
          <span>Notes (optional)</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
          />
        </label>

        {error && <p className="alert-error form-field--wide">{error}</p>}

        <div className="form-actions form-field--wide">
          <button type="submit" className="btn btn-primary">
            {editing ? "Save changes" : "Create goal"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export function buildGoalFromForm(
  form: GoalFormState,
  editing: Goal | null,
  liabilities: Liability[],
): { goal?: Goal; error?: string } {
  let baselineAmount = parseFloat(form.baselineAmount) || 0;
  const linkedLiabilityIds = form.linkedLiabilityIds;
  if (
    form.kind === "debt" &&
    linkedLiabilityIds.length > 0 &&
    baselineAmount === 0
  ) {
    baselineAmount = liabilities
      .filter((l) => linkedLiabilityIds.includes(l.id))
      .reduce((sum, l) => sum + l.balance, 0);
  }

  const payload = {
    name: form.name.trim(),
    kind: form.kind,
    targetAmount: parseFloat(form.targetAmount),
    baselineAmount,
    monthlyPlan: parseFloat(form.monthlyPlan) || 0,
    targetDate: form.targetDate.trim() || undefined,
    linkedAssetIds: form.linkedAssetIds,
    linkedLiabilityIds: form.linkedLiabilityIds,
    linkedTransactionIds: editing?.linkedTransactionIds ?? [],
    notes: form.notes.trim() || undefined,
  };

  const result = goalSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  const now = new Date().toISOString();
  return {
    goal: {
      id: editing?.id ?? crypto.randomUUID(),
      ...result.data,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}
