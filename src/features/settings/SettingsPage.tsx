import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { AiAssistConsentModal } from "../../components/AiAssistConsentModal";
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
    exportEncryptedBackup,
    exportStrippedDiagnosticBackup,
    exportStatementTemplateBackup,
    importBackupFile,
    peekBackupFileKind,
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
  const [includeApiKeyInBackup, setIncludeApiKeyInBackup] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [showEncryptedExport, setShowEncryptedExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [pendingEncryptedImport, setPendingEncryptedImport] = useState<File | null>(
    null,
  );

  const userRules = categoryRules.filter((r) => !r.isDefault);
  const defaultRules = categoryRules.filter((r) => r.isDefault);

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dateStamp = () => new Date().toISOString().slice(0, 10);

  const handleEncryptedExport = async () => {
    if (exportPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Backup password must be at least 8 characters.",
      });
      return;
    }
    if (exportPassword !== exportPasswordConfirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    try {
      const backup = await exportEncryptedBackup(exportPassword, {
        includeGeminiApiKey: includeApiKeyInBackup,
      });
      downloadJson(
        backup,
        `myfinancepal-encrypted-backup-${dateStamp()}.json`,
      );
      setShowEncryptedExport(false);
      setExportPassword("");
      setExportPasswordConfirm("");
      setMessage({
        type: "success",
        text: includeApiKeyInBackup
          ? "Encrypted backup downloaded (includes API key — store securely)."
          : "Encrypted backup downloaded (API key excluded by default).",
      });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not create encrypted backup.",
      });
    }
  };

  const handleStrippedExport = () => {
    const backup = exportStrippedDiagnosticBackup();
    downloadJson(backup, `myfinancepal-diagnostic-${dateStamp()}.json`);
    setMessage({
      type: "success",
      text: "Stripped diagnostic backup downloaded (not restorable).",
    });
  };

  const handleTemplateExport = () => {
    const backup = exportStatementTemplateBackup();
    downloadJson(backup, `myfinancepal-templates-${dateStamp()}.json`);
    setMessage({
      type: "success",
      text: "Statement template export downloaded (not restorable).",
    });
  };

  const handleImport = async (file: File, password?: string) => {
    try {
      const kind = await peekBackupFileKind(file);
      if (kind === "non_restorable") {
        setMessage({
          type: "error",
          text: "This file is a diagnostic or template export and cannot be restored.",
        });
        return;
      }
      if (kind === "encrypted" && !password?.trim()) {
        setPendingEncryptedImport(file);
        return;
      }
      await importBackupFile(file, password);
      setPendingEncryptedImport(null);
      setImportPassword("");
      setGeminiKeyInput("");
      setMessage({
        type: "success",
        text: "Backup restored. AI Assist is off — re-enter your API key if needed.",
      });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Invalid backup file.",
      });
    }
  };

  const handleEncryptedImportConfirm = async () => {
    if (!pendingEncryptedImport) return;
    await handleImport(pendingEncryptedImport, importPassword);
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

  const handleToggleAiAssist = (enabled: boolean) => {
    if (!enabled) {
      void updateAppSettings({ aiAssistEnabled: false }).then(() =>
        setMessage({ type: "success", text: "AI Assist disabled — local rules only." }),
      );
      return;
    }
    if (!geminiKeyInput.trim() && !settings.geminiApiKey.trim()) {
      setMessage({
        type: "error",
        text: "Add and save a Gemini API key before enabling AI Assist.",
      });
      return;
    }
    setShowAiConsent(true);
  };

  const confirmAiAssist = async () => {
    await updateAppSettings({ aiAssistEnabled: true });
    setShowAiConsent(false);
    setMessage({
      type: "success",
      text: "AI Assist enabled — not private/offline mode.",
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

      <AiAssistConsentModal
        open={showAiConsent}
        onConfirm={() => void confirmAiAssist()}
        onCancel={() => setShowAiConsent(false)}
      />

      <section className="card">
        <h2>AI Assist (optional — not offline/private)</h2>
        <p className="help-text">{AI_ASSIST_PRIVACY_WARNING}</p>
        <p className="alert alert-warning">
          AI Assist is <strong>not</strong> private mode. Transaction data may leave your device for Google Gemini.
        </p>

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
          <span>Enable AI Assist (sends redacted data to Google)</span>
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
          Choose an export that matches how you will use the file. Only{" "}
          <strong>full encrypted backups</strong> can restore your data.
        </p>

        <div className="backup-option">
          <h3>Full encrypted backup</h3>
          <p className="backup-option-label">For personal restore</p>
          <p className="help-text">
            Exports all data, encrypted with AES-GCM (key derived from your password via
            PBKDF2). Gemini API key is excluded unless you opt in below.
          </p>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={includeApiKeyInBackup}
              onChange={(e) => setIncludeApiKeyInBackup(e.target.checked)}
            />
            <span>Include Gemini API key — not recommended</span>
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowEncryptedExport(true)}
            >
              Export encrypted backup
            </button>
          </div>
        </div>

        <div className="backup-option">
          <h3>Stripped diagnostic backup</h3>
          <p className="backup-option-label">For support / debugging</p>
          <p className="help-text">
            Removes names, addresses, account numbers, notes, API keys, and merchant
            text. Merchants become stable pseudonyms (e.g. MERCHANT_001). Keeps dates,
            amounts, categories, types, and reconciliation totals.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStrippedExport}
            >
              Export diagnostic backup
            </button>
          </div>
        </div>

        <div className="backup-option">
          <h3>Statement template export</h3>
          <p className="backup-option-label">For community parser sharing</p>
          <p className="help-text">
            Parser detection rules, column mapping hints, date formats, reconciliation
            formulas, and edge cases only — no transactions or statement text.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTemplateExport}
            >
              Export templates
            </button>
          </div>
        </div>

        <div className="backup-option backup-option--restore">
          <h3>Restore</h3>
          <p className="help-text">
            Import a full encrypted backup (or legacy unencrypted JSON). Diagnostic and
            template exports cannot be restored.
          </p>
          {pendingEncryptedImport ? (
            <div className="backup-import-password">
              <p className="help-text">
                Encrypted backup selected:{" "}
                <strong>{pendingEncryptedImport.name}</strong>
              </p>
              <label className="form-field form-field--full">
                <span>Backup password</span>
                <input
                  type="password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleEncryptedImportConfirm()}
                >
                  Decrypt and restore
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPendingEncryptedImport(null);
                    setImportPassword("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="form-actions">
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
                  if (file) void handleImport(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      </section>

      {showEncryptedExport ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="encrypted-backup-title"
        >
          <div className="modal-card">
            <h2 id="encrypted-backup-title">Encrypt backup</h2>
            <p className="help-text">
              Choose a strong password. You will need it to restore this file.
            </p>
            <label className="form-field form-field--full">
              <span>Backup password</span>
              <input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="form-field form-field--full">
              <span>Confirm password</span>
              <input
                type="password"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleEncryptedExport()}
              >
                Download encrypted backup
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowEncryptedExport(false);
                  setExportPassword("");
                  setExportPasswordConfirm("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
