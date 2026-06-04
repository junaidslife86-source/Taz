import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import {
  RememberRulePrompt,
  useRememberRulePrompt,
} from "../../components/RememberRulePrompt";
import { useFinanceStore } from "../../lib/storage";
import { suggestRememberRule } from "../../lib/categorisation";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { formatCategoryLabel } from "../../lib/category-display";
import type { Transaction, TransactionType } from "../../types/finance";
import { transactionSchema } from "../../lib/validation";
import {
  matchesTransactionSearch,
  TRANSACTION_SEARCH_PARAM,
} from "../../lib/transaction-search-query";

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  type: "expense" as TransactionType,
  category: "Other",
  accountName: "",
};

export function TransactionsPage() {
  const {
    transactions,
    categories,
    settings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    rememberCategoryRule,
  } = useFinanceStore();

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get(TRANSACTION_SEARCH_PARAM) ?? "";
  const setSearch = (value: string) => {
    const trimmed = value.trim();
    setSearchParams(trimmed ? { [TRANSACTION_SEARCH_PARAM]: trimmed } : {}, {
      replace: true,
    });
  };
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { categoryFilter?: string } | null;
    if (state?.categoryFilter) {
      setCategoryFilter(state.categoryFilter);
    }
  }, [location.state]);
  const rememberPrompt = useRememberRulePrompt();

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (!matchesTransactionSearch(t, search)) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, search, categoryFilter, dateFrom, dateTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amountNum = parseFloat(form.amount);
    const signedAmount =
      form.type === "expense" ? -Math.abs(amountNum) : Math.abs(amountNum);

    const result = transactionSchema.safeParse({
      date: form.date,
      description: form.description,
      amount: signedAmount,
      type: form.type,
      category: form.category,
      accountName: form.accountName || undefined,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    await addTransaction({
      id: crypto.randomUUID(),
      ...result.data,
      importedAt: new Date().toISOString(),
    });
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleCategoryChange = async (
    t: Transaction,
    category: string,
    previousCategory: string,
  ) => {
    await updateTransaction({ ...t, category });
    if (category !== previousCategory) {
      const suggestion = suggestRememberRule(t.description, category);
      rememberPrompt.show(suggestion);
    }
  };

  const handleTypeChange = async (t: Transaction, type: TransactionType) => {
    const amount =
      type === "expense"
        ? -Math.abs(t.amount)
        : type === "income"
          ? Math.abs(t.amount)
          : t.amount;
    await updateTransaction({ ...t, type, amount });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim(), newCategoryEmoji);
    setForm((f) => ({ ...f, category: newCategory.trim() }));
    setNewCategory("");
    setNewCategoryEmoji("");
  };

  return (
    <div className="page">
      <Header
        title="Transactions"
        subtitle="View, filter, and manage your transactions"
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Add transaction"}
          </button>
        }
      />

      {rememberPrompt.pending && (
        <RememberRulePrompt
          label={rememberPrompt.pending.label}
          onRemember={async () => {
            await rememberCategoryRule(
              rememberPrompt.pending!.keywords,
              rememberPrompt.pending!.category,
            );
            rememberPrompt.dismiss();
          }}
          onDismiss={rememberPrompt.dismiss}
        />
      )}

      {showForm && (
        <section className="card">
          <h2>Add transaction</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleSubmit} className="form-grid">
            <label className="form-field">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Description</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TransactionType })
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>
            <label className="form-field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {formatCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Account (optional)</span>
              <input
                type="text"
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              />
            </label>
            <div className="form-field form-field--inline category-add-row">
              <input
                type="text"
                className="inline-input category-emoji-input"
                placeholder="🛒"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                aria-label="New category emoji"
                maxLength={8}
              />
              <input
                type="text"
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCategory}>
                Add category
              </button>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save transaction
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="filters-row">
          <input
            type="search"
            placeholder="Search any transactions"
            aria-label="Search any transactions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-input"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {formatCategoryLabel(c)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="filter-input"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="filter-input"
            aria-label="To date"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Try adjusting your filters or import a bank statement."
          />
        ) : (
          <DataTable<Transaction>
            data={filtered}
            keyField="id"
            columns={[
              {
                key: "date",
                header: "Date",
                render: (t) => formatDate(t.date),
              },
              { key: "description", header: "Description" },
              {
                key: "amount",
                header: "Amount",
                render: (t) => (
                  <span className={t.amount >= 0 ? "text-positive" : "text-negative"}>
                    {formatCurrency(t.amount, settings.defaultCurrency)}
                  </span>
                ),
              },
              {
                key: "category",
                header: "Category",
                render: (t) => (
                  <select
                    value={t.category}
                    onChange={(e) =>
                      handleCategoryChange(t, e.target.value, t.category)
                    }
                    className="inline-select"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {formatCategoryLabel(c)}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                key: "type",
                header: "Type",
                render: (t) => (
                  <select
                    value={t.type}
                    onChange={(e) =>
                      handleTypeChange(t, e.target.value as TransactionType)
                    }
                    className="inline-select"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (t) => (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteTransaction(t.id)}
                  >
                    Delete
                  </button>
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}
