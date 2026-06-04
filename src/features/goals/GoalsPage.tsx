import { useState } from "react";
import { Header } from "../../components/Header";
import { EmptyState } from "../../components/EmptyState";
import { useFinanceStore } from "../../lib/storage";
import type { Goal, GoalKind } from "../../types/finance";
import { GoalCard } from "./components/GoalCard";
import {
  GoalForm,
  buildGoalFromForm,
  type GoalFormState,
} from "./components/GoalForm";

const emptyForm = (kind: GoalKind = "savings"): GoalFormState => ({
  name: "",
  kind,
  targetAmount: "",
  baselineAmount: "0",
  monthlyPlan: "",
  targetDate: "",
  linkedAssetIds: [],
  linkedLiabilityIds: [],
  notes: "",
});

export function GoalsPage() {
  const {
    goals,
    goalEntries,
    assets,
    liabilities,
    transactions,
    settings,
    addGoal,
    updateGoal,
    deleteGoal,
    addGoalEntry,
    deleteGoalEntry,
  } = useFinanceStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  const currency = settings.defaultCurrency;

  const openCreate = (kind: GoalKind) => {
    setEditing(null);
    setForm(emptyForm(kind));
    setError(null);
    setShowForm(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      kind: goal.kind,
      targetAmount: String(goal.targetAmount),
      baselineAmount: String(goal.baselineAmount),
      monthlyPlan: String(goal.monthlyPlan),
      targetDate: goal.targetDate ?? "",
      linkedAssetIds: [...goal.linkedAssetIds],
      linkedLiabilityIds: [...goal.linkedLiabilityIds],
      notes: goal.notes ?? "",
    });
    setError(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { goal, error: validationError } = buildGoalFromForm(
      form,
      editing,
      liabilities,
    );
    if (validationError || !goal) {
      setError(validationError ?? "Invalid input");
      return;
    }
    if (editing) await updateGoal(goal);
    else await addGoal(goal);
    resetForm();
  };

  const handleDelete = async (goal: Goal) => {
    if (
      !window.confirm(
        `Delete “${goal.name}”? Manual entries for this goal will be removed.`,
      )
    ) {
      return;
    }
    await deleteGoal(goal.id);
  };

  return (
    <div className="page goals-page">
      <Header
        title="Goals"
        subtitle="Save for what matters and pay down debt — all on your device"
        action={
          !showForm ? (
            <div className="goals-page__header-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openCreate("savings")}
              >
                Save for something
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => openCreate("debt")}
              >
                Pay down debt
              </button>
            </div>
          ) : undefined
        }
      />

      {showForm && (
        <GoalForm
          form={form}
          editing={editing}
          assets={assets}
          liabilities={liabilities}
          error={error}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      {goals.length === 0 && !showForm ? (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          description="Create a savings goal or a debt payoff goal to see your progress here."
          action={
            <div className="goals-empty-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openCreate("savings")}
              >
                Save for something
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => openCreate("debt")}
              >
                Pay down debt
              </button>
            </div>
          }
        />
      ) : (
        <div className="goals-list">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              entries={goalEntries}
              assets={assets}
              liabilities={liabilities}
              transactions={transactions}
              currency={currency}
              onEdit={() => openEdit(goal)}
              onDelete={() => handleDelete(goal)}
              onAddEntry={async (entry) => {
                await addGoalEntry({
                  ...entry,
                  id: crypto.randomUUID(),
                  createdAt: new Date().toISOString(),
                });
              }}
              onDeleteEntry={deleteGoalEntry}
              onUpdateGoal={updateGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
