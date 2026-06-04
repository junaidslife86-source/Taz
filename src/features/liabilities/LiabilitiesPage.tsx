import { useState } from "react";
import { Header } from "../../components/Header";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { useFinanceStore } from "../../lib/storage";
import { formatCurrency, titleCase } from "../../lib/formatters";
import type { Liability, LiabilityType, RepaymentFrequency } from "../../types/finance";
import { liabilitySchema } from "../../lib/validation";

const liabilityTypes: { value: LiabilityType; label: string }[] = [
  { value: "mortgage", label: "Mortgage" },
  { value: "credit_card", label: "Credit card" },
  { value: "personal_loan", label: "Personal loan" },
  { value: "student_loan", label: "HECS/HELP debt" },
  { value: "car_loan", label: "Car loan" },
  { value: "other", label: "Other debt" },
];

const frequencies: RepaymentFrequency[] = [
  "weekly",
  "fortnightly",
  "monthly",
  "yearly",
];

const emptyForm = {
  name: "",
  liabilityType: "mortgage" as LiabilityType,
  balance: "",
  interestRate: "",
  repaymentAmount: "",
  repaymentFrequency: "monthly" as RepaymentFrequency,
  notes: "",
};

export function LiabilitiesPage() {
  const { liabilities, settings, addLiability, updateLiability, deleteLiability } =
    useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const openEdit = (liability: Liability) => {
    setEditing(liability);
    setForm({
      name: liability.name,
      liabilityType: liability.liabilityType,
      balance: String(liability.balance),
      interestRate:
        liability.interestRate != null ? String(liability.interestRate) : "",
      repaymentAmount:
        liability.repaymentAmount != null
          ? String(liability.repaymentAmount)
          : "",
      repaymentFrequency: liability.repaymentFrequency ?? "monthly",
      notes: liability.notes ?? "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      liabilityType: form.liabilityType,
      balance: parseFloat(form.balance),
      interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
      repaymentAmount: form.repaymentAmount
        ? parseFloat(form.repaymentAmount)
        : undefined,
      repaymentFrequency: form.repaymentAmount
        ? form.repaymentFrequency
        : undefined,
      notes: form.notes || undefined,
    };

    const result = liabilitySchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const liability: Liability = {
      id: editing?.id ?? crypto.randomUUID(),
      ...result.data,
      updatedAt: new Date().toISOString(),
    };

    if (editing) {
      await updateLiability(liability);
    } else {
      await addLiability(liability);
    }
    resetForm();
  };

  return (
    <div className="page">
      <Header
        title="Liabilities"
        subtitle="Track mortgages, loans, and other debts"
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add liability
          </button>
        }
      />

      {showForm && (
        <section className="card">
          <h2>{editing ? "Edit liability" : "Add liability"}</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit} className="form-grid">
            <label className="form-field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Type</span>
              <select
                value={form.liabilityType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    liabilityType: e.target.value as LiabilityType,
                  })
                }
              >
                {liabilityTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Current balance</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Interest rate % (optional)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.interestRate}
                onChange={(e) =>
                  setForm({ ...form, interestRate: e.target.value })
                }
              />
            </label>
            <label className="form-field">
              <span>Repayment amount (optional)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.repaymentAmount}
                onChange={(e) =>
                  setForm({ ...form, repaymentAmount: e.target.value })
                }
              />
            </label>
            <label className="form-field">
              <span>Repayment frequency</span>
              <select
                value={form.repaymentFrequency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    repaymentFrequency: e.target.value as RepaymentFrequency,
                  })
                }
              >
                {frequencies.map((f) => (
                  <option key={f} value={f}>
                    {titleCase(f)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field form-field--full">
              <span>Notes (optional)</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? "Update" : "Save"} liability
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        {liabilities.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No liabilities yet"
            description="Add your mortgage, loans, and credit cards to calculate your net worth."
          />
        ) : (
          <DataTable<Liability>
            data={liabilities}
            keyField="id"
            columns={[
              { key: "name", header: "Name" },
              {
                key: "liabilityType",
                header: "Type",
                render: (l) => titleCase(l.liabilityType),
              },
              {
                key: "balance",
                header: "Balance",
                render: (l) => formatCurrency(l.balance, settings.defaultCurrency),
              },
              {
                key: "interestRate",
                header: "Rate",
                render: (l) =>
                  l.interestRate != null ? `${l.interestRate}%` : "—",
              },
              {
                key: "actions",
                header: "",
                render: (l) => (
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(l)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteLiability(l.id)}
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}
