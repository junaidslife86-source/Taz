import { useState } from "react";
import { Header } from "../../components/Header";
import { DataTable } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { useFinanceStore } from "../../lib/storage";
import { formatCurrency, titleCase } from "../../lib/formatters";
import type { Asset, AssetType } from "../../types/finance";
import { assetSchema } from "../../lib/validation";

const assetTypes: { value: AssetType; label: string }[] = [
  { value: "cash", label: "Cash account" },
  { value: "superannuation", label: "Superannuation" },
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "property", label: "Property" },
  { value: "vehicle", label: "Vehicle" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  name: "",
  assetType: "cash" as AssetType,
  value: "",
  currency: "AUD",
  notes: "",
  ticker: "",
  units: "",
  averageCost: "",
};

export function AssetsPage() {
  const { assets, settings, addAsset, updateAsset, deleteAsset } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const isStockOrEtf = form.assetType === "stock" || form.assetType === "etf";

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      assetType: asset.assetType,
      value: String(asset.value),
      currency: asset.currency,
      notes: asset.notes ?? "",
      ticker: asset.ticker ?? "",
      units: asset.units != null ? String(asset.units) : "",
      averageCost: asset.averageCost != null ? String(asset.averageCost) : "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ ...emptyForm, currency: settings.defaultCurrency });
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      assetType: form.assetType,
      value: parseFloat(form.value),
      currency: form.currency,
      notes: form.notes || undefined,
      ticker: isStockOrEtf ? form.ticker || undefined : undefined,
      units: isStockOrEtf && form.units ? parseFloat(form.units) : undefined,
      averageCost:
        isStockOrEtf && form.averageCost
          ? parseFloat(form.averageCost)
          : undefined,
    };

    const result = assetSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    const asset: Asset = {
      id: editing?.id ?? crypto.randomUUID(),
      ...result.data,
      updatedAt: new Date().toISOString(),
    };

    if (editing) {
      await updateAsset(asset);
    } else {
      await addAsset(asset);
    }
    resetForm();
  };

  return (
    <div className="page">
      <Header
        title="Assets"
        subtitle="Track cash, investments, property, and more"
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add asset
          </button>
        }
      />

      {showForm && (
        <section className="card">
          <h2>{editing ? "Edit asset" : "Add asset"}</h2>
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
                value={form.assetType}
                onChange={(e) =>
                  setForm({ ...form, assetType: e.target.value as AssetType })
                }
              >
                {assetTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Current value</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Currency</span>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </label>
            {isStockOrEtf && (
              <>
                <label className="form-field">
                  <span>Ticker</span>
                  <input
                    type="text"
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                    placeholder="e.g. VAS"
                  />
                </label>
                <label className="form-field">
                  <span>Number of units</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.units}
                    onChange={(e) => setForm({ ...form, units: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Average cost per unit</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.averageCost}
                    onChange={(e) =>
                      setForm({ ...form, averageCost: e.target.value })
                    }
                  />
                </label>
              </>
            )}
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
                {editing ? "Update" : "Save"} asset
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        {assets.length === 0 ? (
          <EmptyState
            icon="🏦"
            title="No assets yet"
            description="Add your cash accounts, super, property, and investments to track your total assets."
          />
        ) : (
          <DataTable<Asset>
            data={assets}
            keyField="id"
            columns={[
              { key: "name", header: "Name" },
              {
                key: "assetType",
                header: "Type",
                render: (a) => titleCase(a.assetType),
              },
              {
                key: "value",
                header: "Value",
                render: (a) => formatCurrency(a.value, a.currency),
              },
              {
                key: "ticker",
                header: "Ticker",
                render: (a) => a.ticker ?? "—",
              },
              {
                key: "actions",
                header: "",
                render: (a) => (
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(a)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteAsset(a.id)}
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
