import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { useFinanceStore, createUserRule } from "../../lib/storage";
import {
  APP_VERSION,
  PRIVACY_STATEMENT,
  DISCLAIMER,
  AI_ASSIST_PRIVACY_WARNING,
  isFallbackCategory,
} from "../../types/finance";
import { categoryRuleSchema } from "../../lib/validation";
import {
  accountTypeLabel,
  formatLabel,
} from "../../lib/statement-profiles";
import { formatCategoryLabel } from "../../lib/category-display";

export function SettingsPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    categories,
    categoryRules,
    settings,
    exportBackup,
    importBackup,
    clearData,
    setOnboardingComplete,
    deleteCategory,
    addCategory,
    updateCategory,
    addCategoryRule,
    deleteCategoryRule,
    statementProfiles,
    deleteStatementProfile,
    updateAppSettings,
  } = useFinanceStore();

  const [geminiKeyInput, setGeminiKeyInput] = useState(settings.geminiApiKey);

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleCategory, setRuleCategory] = useState("Groceries");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const userRules = categoryRules.filter((r) => !r.isDefault);
  const defaultRules = categoryRules.filter((r) => r.isDefault);

  const handleExport = () => {
    const backup = exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `myfinancepal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Backup downloaded successfully." });
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importBackup(data);
      setMessage({ type: "success", text: "Backup restored successfully." });
    } catch {
      setMessage({ type: "error", text: "Invalid backup file. Please check the file and try again." });
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearData();
    setConfirmClear(false);
    navigate("/onboarding", { replace: true });
  };

  const handleResetOnboarding = async () => {
    await setOnboardingComplete(false);
    navigate("/onboarding", { replace: true });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await addCategory(newCategory.trim(), newCategoryEmoji);
    setNewCategory("");
    setNewCategoryEmoji("");
    setMessage({ type: "success", text: "Category added." });
  };

  const handleSaveGeminiKey = async () => {
    await updateAppSettings({ geminiApiKey: geminiKeyInput.trim() });
    setMessage({ type: "success", text: "API key saved locally in this browser." });
  };

  const handleToggleAiAssist = async (enabled: boolean) => {
    if (enabled && !geminiKeyInput.trim() && !settings.geminiApiKey.trim()) {
      setMessage({
        type: "error",
        text: "Add and save a Gemini API key before enabling AI Assist.",
      });
      return;
    }
    await updateAppSettings({ aiAssistEnabled: enabled });
    setMessage({
      type: "success",
      text: enabled
        ? "AI Assist enabled — uncategorised transactions may use Gemini."
        : "AI Assist disabled — local rules only.",
    });
  };

  const handleAddRule = async () => {
    const keywords = ruleKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const result = categoryRuleSchema.safeParse({
      keywords,
      category: ruleCategory,
    });
    if (!result.success) {
      setMessage({ type: "error", text: "Enter at least one keyword and a category." });
      return;
    }
    await addCategoryRule(createUserRule(keywords, ruleCategory));
    setRuleKeywords("");
    setMessage({ type: "success", text: "Categorisation rule added." });
  };

  return (
    <div className="page">
      <Header title="Settings" subtitle="Backup, restore, and app preferences" />

      {message && (
        <div className={`alert alert-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <section className="card">
        <h2>Privacy</h2>
        <p className="privacy-text">{PRIVACY_STATEMENT}</p>
        <div className="mode-badges">
          <span className="offline-badge">Local-first — data stays in your browser</span>
          {settings.aiAssistEnabled && (
            <span className="badge badge-warning">AI Assist on (Gemini)</span>
          )}
        </div>
        <p className="disclaimer">{DISCLAIMER}</p>
      </section>

      <section className="card">
        <h2>Categorisation rules</h2>
        <p className="help-text">
          MyFinancePal categorises transactions locally using keyword rules. User rules take priority over defaults.
        </p>

        <h3>Your rules</h3>
        {userRules.length === 0 ? (
          <p className="help-text">No custom rules yet. Add one below or remember a rule when editing a transaction.</p>
        ) : (
          <ul className="rule-list">
            {userRules.map((r) => (
              <li key={r.id}>
                <span className="rule-keywords">{r.keywords.join(", ")}</span>
                <span className="rule-arrow">→</span>
                <span className="rule-category">{r.category}</span>
                <span className="badge">{r.source === "remembered" ? "Remembered" : "Custom"}</span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteCategoryRule(r.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="form-grid form-grid--rules">
          <label className="form-field">
            <span>Keywords (comma-separated)</span>
            <input
              type="text"
              placeholder="e.g. woolworths, coles"
              value={ruleKeywords}
              onChange={(e) => setRuleKeywords(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Category</span>
            <select
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {formatCategoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleAddRule}>
              Add rule
            </button>
          </div>
        </div>

        <details className="default-rules-details">
          <summary>View default rules ({defaultRules.length})</summary>
          <ul className="rule-list rule-list--compact">
            {defaultRules.map((r) => (
              <li key={r.id}>
                <span className="rule-keywords">{r.keywords.join(", ")}</span>
                <span className="rule-arrow">→</span>
                <span className="rule-category">{r.category}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card">
        <h2>Saved statement profiles</h2>
        <p className="help-text">
          Profiles learned from PDF imports. Matching filenames or statement text will auto-apply parser settings and account type on your next upload.
        </p>
        {statementProfiles.length === 0 ? (
          <p className="empty-table-message">No saved profiles yet. Complete a PDF import and choose &quot;Remember&quot; on the confirmation screen.</p>
        ) : (
          <ul className="rule-list">
            {statementProfiles.map((p) => (
              <li key={p.id} className="profile-list-item">
                <div>
                  <strong>{p.label}</strong>
                  <span className="help-text">
                    {accountTypeLabel(p.accountType)} · {formatLabel(p.statementFormat)}
                    {p.importCount > 0 && ` · used ${p.importCount}×`}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteStatementProfile(p.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>AI Assist (optional)</h2>
        <p className="help-text">{AI_ASSIST_PRIVACY_WARNING}</p>

        <ol className="ai-assist-steps">
          <li>
            Create a free API key at{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
            .
          </li>
          <li>Paste the key below and click <strong>Save API key</strong>.</li>
          <li>
            Enable the toggle. Gemini is only used when local rules do not match a
            transaction.
          </li>
          <li>
            Bulk import preview still uses local rules only (faster). Change
            categories manually or use AI when editing individual transactions
            if needed.
          </li>
        </ol>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={settings.aiAssistEnabled}
            onChange={(e) => handleToggleAiAssist(e.target.checked)}
          />
          <span>Enable AI Assist for categorisation</span>
        </label>

        <label className="form-field form-field--full">
          <span>Gemini API key</span>
          <input
            type="password"
            placeholder="Paste your API key"
            value={geminiKeyInput}
            onChange={(e) => setGeminiKeyInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p className="help-text">
          Stored only in this browser (IndexedDB). Never shared with MyFinancePal
          servers — requests go directly from your device to Google.
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveGeminiKey}
          >
            Save API key
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Backup &amp; restore</h2>
        <p className="help-text">
          Export all your data as a JSON file. Store it somewhere safe — your data lives only in this browser.
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            Export backup
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="file-uploader-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="card">
        <h2>Categories</h2>
        <p className="help-text">
          Set an emoji and name for each category. Rename or remove any category except <strong>Other</strong> (fallback for uncategorised transactions).
        </p>
        <ul className="category-list category-list--editable">
          {categories.map((c) => (
            <li key={c.id} className="category-list-item">
              <input
                type="text"
                className="inline-input category-emoji-input"
                defaultValue={c.emoji}
                aria-label={`Emoji for ${c.name}`}
                placeholder="😀"
                maxLength={8}
                onBlur={(e) => {
                  const next = e.target.value;
                  if (next !== c.emoji) {
                    void updateCategory(c.id, { emoji: next });
                  }
                }}
              />
              {isFallbackCategory(c) ? (
                <>
                  <span className="category-name-readonly">{c.name}</span>
                  <span className="badge">Fallback</span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    className="inline-input category-rename-input"
                    defaultValue={c.name}
                    aria-label={`Rename ${c.name}`}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== c.name) {
                        void updateCategory(c.id, { name: next });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteCategory(c.id)}
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
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
      </section>

      <section className="card">
        <h2>Data management</h2>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={handleResetOnboarding}>
            Reset onboarding
          </button>
          <button
            type="button"
            className={`btn ${confirmClear ? "btn-danger" : "btn-secondary"}`}
            onClick={handleClear}
          >
            {confirmClear ? "Confirm: delete all data" : "Clear all local data"}
          </button>
        </div>
        {confirmClear && (
          <p className="alert alert-error">
            This will permanently delete all transactions, assets, liabilities, and snapshots. Click again to confirm.
          </p>
        )}
      </section>

      <section className="card">
        <h2>About</h2>
        <p>
          <strong>MyFinancePal</strong> v{APP_VERSION}
        </p>
        <p className="help-text">
          Offline-ready personal finance tracker. No accounts, no cloud, no tracking.
        </p>
        <p className="offline-badge">✓ Works offline after first load</p>
      </section>
    </div>
  );
}
