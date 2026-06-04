import { useState } from "react";
import { Header } from "../../components/Header";
import { FileUploader } from "../../components/FileUploader";
import { DataTable } from "../../components/DataTable";
import { useFinanceStore } from "../../lib/storage";
import {
  parseFile,
  guessColumnMapping,
  rowsToTransactions,
  type ParseResult,
  type ParsedRow,
} from "../../lib/parsers";
import type { PdfParseResult } from "../../lib/pdf-parser";
import { createEmptyDraft } from "../../lib/draft-transaction";
import {
  accountTypeFromFormat,
  accountTypeLabel,
  formatLabel,
} from "../../lib/statement-profiles";
import type {
  FinancialAccountType,
  StatementFormat,
} from "../../types/finance";
import { RememberRulePrompt } from "../../components/RememberRulePrompt";
import { findDuplicates } from "../../lib/calculations";
import type { ColumnMapping, DraftTransaction, Transaction } from "../../types/finance";
import { PDF_IMPORT_WARNING } from "../../types/finance";
import { formatCurrency } from "../../lib/formatters";
import { formatCategoryLabel } from "../../lib/category-display";
import { StatementReconciliationCard } from "../../components/StatementReconciliationCard";

type Step = "upload" | "map" | "pdf_review" | "preview" | "done";
type FileKind = "structured" | "pdf";

const mappingFields: { key: keyof ColumnMapping; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "debit", label: "Debit / withdrawal" },
  { key: "credit", label: "Credit / deposit" },
  { key: "amount", label: "Single amount column" },
  { key: "balance", label: "Balance (optional)" },
  { key: "accountName", label: "Account name (optional)" },
];

const accountTypeOptions: FinancialAccountType[] = [
  "credit_card",
  "transaction_account",
  "savings",
  "unknown",
];

const formatOptions: StatementFormat[] = [
  "westpac_credit_card",
  "westpac_transaction",
  "generic",
];

export function ImportPage() {
  const {
    transactions,
    addTransactions,
    categoriseInputs,
    settings,
    statementProfiles,
    saveStatementProfile,
    categories,
  } = useFinanceStore();
  const [step, setStep] = useState<Step>("upload");
  const [fileKind, setFileKind] = useState<FileKind>("structured");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfParseResult | null>(null);
  const [pdfDrafts, setPdfDrafts] = useState<DraftTransaction[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [duplicates, setDuplicates] = useState<Transaction[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [categorising, setCategorising] = useState(false);
  const [importAccountName, setImportAccountName] = useState("");
  const [importAccountType, setImportAccountType] =
    useState<FinancialAccountType>("unknown");
  const [importStatementFormat, setImportStatementFormat] =
    useState<StatementFormat>("generic");
  const [rememberStatementPrompt, setRememberStatementPrompt] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "pdf") {
        const { parsePdf } = await import("../../lib/pdf-parser");
        const result = await parsePdf(file, { profiles: statementProfiles });
        const format = result.detectedFormat ?? "generic";
        setFileKind("pdf");
        setPdfResult(result);
        setPdfDrafts(result.transactions);
        setImportAccountName(result.accountName ?? "");
        setImportStatementFormat(format);
        const matched = result.matchedProfileId
          ? statementProfiles.find((p) => p.id === result.matchedProfileId)
          : undefined;
        setImportAccountType(
          matched?.accountType ?? accountTypeFromFormat(format),
        );
        setRememberStatementPrompt(false);
        setProfileSaved(false);
        setStep("pdf_review");
        return;
      }

      const result = await parseFile(file);
      const guessed = guessColumnMapping(result.headers);
      setFileKind("structured");
      setParseResult(result);
      setMapping(guessed);
      setStep("map");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    }
  };

  const categoriseParsed = async (parsed: Transaction[]) => {
    const results = await categoriseInputs(
      parsed.map((t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
      })),
      { localOnly: true },
    );
    return parsed.map((t, i) => ({
      ...t,
      category: results[i]?.category ?? t.category,
    }));
  };

  const handlePreview = async () => {
    if (!parseResult) return;
    setError(null);
    setCategorising(true);
    try {
      const { transactions: parsed, skipped: skipCount } = rowsToTransactions(
        parseResult.rows,
        mapping,
        parseResult.fileName,
      );

      if (parsed.length === 0) {
        setError(
          "No transactions could be parsed. Check your column mapping — date, description, and amount fields are required.",
        );
        return;
      }

      const withCategories = await categoriseParsed(parsed);
      const dups = findDuplicates(transactions, withCategories);
      setPreview(withCategories);
      setDuplicates(dups);
      setSkipped(skipCount);
      setStep("preview");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Preview failed. Please try again.",
      );
    } finally {
      setCategorising(false);
    }
  };

  const handlePdfPreview = async () => {
    if (!pdfResult) return;
    setError(null);
    setCategorising(true);
    try {
      const validDrafts = pdfDrafts.filter(
        (d) => d.date && d.description.trim() && d.amount !== 0,
      );
      if (validDrafts.length === 0) {
        setError(
          "Add at least one transaction with a date, description, and non-zero amount.",
        );
        return;
      }

      const parsed: Transaction[] = validDrafts.map((d) => ({
        id: d.id,
        date: d.date,
        description: d.description,
        amount: d.amount,
        type: d.amount >= 0 ? "income" : "expense",
        category: d.amount >= 0 ? "Income" : "Other",
        sourceFile: pdfResult.fileName,
        accountName: importAccountName.trim() || pdfResult.accountName,
        importedAt: new Date().toISOString(),
      }));

      const withCategories = await categoriseParsed(parsed);
      const dups = findDuplicates(transactions, withCategories);
      setPreview(withCategories);
      setDuplicates(dups);
      setSkipped(pdfResult.skippedLines);
      setStep("preview");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Preview failed. Please try again.",
      );
    } finally {
      setCategorising(false);
    }
  };

  const updatePdfDraft = (
    id: string,
    field: keyof DraftTransaction,
    value: string,
  ) => {
    setPdfDrafts((drafts) =>
      drafts.map((d) => {
        if (d.id !== id) return d;
        if (field === "amount") {
          return { ...d, amount: parseFloat(value) || 0 };
        }
        return { ...d, [field]: value };
      }),
    );
  };

  const removePdfDraft = (id: string) => {
    setPdfDrafts((drafts) => drafts.filter((d) => d.id !== id));
  };

  const addPdfDraft = () => {
    setPdfDrafts((drafts) => [...drafts, createEmptyDraft()]);
  };

  const handleImport = async () => {
    setError(null);
    try {
      const existingFingerprints = new Set(
        transactions.map(
          (t) => `${t.date}|${t.description}|${t.amount}|${t.accountName ?? ""}`,
        ),
      );
      const seen = new Set<string>();
      const final = preview.filter((t) => {
        const fp = `${t.date}|${t.description}|${t.amount}|${t.accountName ?? ""}`;
        if (existingFingerprints.has(fp) || seen.has(fp)) return false;
        seen.add(fp);
        return true;
      });
      await addTransactions(final);
      setImportedCount(final.length);
      if (fileKind === "pdf" && pdfResult) {
        setRememberStatementPrompt(true);
      }
      setStep("done");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Import failed. Please try again.",
      );
    }
  };

  const reset = () => {
    setStep("upload");
    setFileKind("structured");
    setParseResult(null);
    setPdfResult(null);
    setPdfDrafts([]);
    setMapping({});
    setPreview([]);
    setDuplicates([]);
    setSkipped(0);
    setError(null);
    setImportedCount(0);
    setImportAccountName("");
    setImportAccountType("unknown");
    setImportStatementFormat("generic");
    setRememberStatementPrompt(false);
    setProfileSaved(false);
  };

  const reparsePdfWithSettings = async (
    format: StatementFormat,
    accountName: string,
  ) => {
    if (!pdfResult) return;
    const { parseStatementText } = await import("../../lib/pdf-parser");
    const parsed = parseStatementText(
      pdfResult.rawText,
      pdfResult.fileName,
      { format, accountName: accountName.trim() || undefined },
    );
    const lineCount = pdfResult.rawText.split(/\r?\n/).filter(Boolean).length;
    setPdfResult({
      ...pdfResult,
      transactions: parsed.transactions,
      detectedFormat: parsed.format,
      accountName: parsed.accountName || undefined,
      stats: parsed.stats,
      summary: parsed.summary,
      reconciliation: parsed.reconciliation,
      statementReconciliation: parsed.statementReconciliation,
      skippedLines: Math.max(0, lineCount - parsed.stats.detectedTransactionCount),
      usedLearnedProfile: false,
      matchedProfileId: undefined,
    });
    setPdfDrafts(parsed.transactions);
    setImportStatementFormat(parsed.format);
    setImportAccountName(parsed.accountName || accountName);
  };

  const handleRememberStatement = async () => {
    if (!pdfResult) return;
    await saveStatementProfile({
      accountName: importAccountName,
      statementFormat: importStatementFormat,
      accountType: importAccountType,
      filename: pdfResult.fileName,
      statementText: pdfResult.rawText,
      profileId: pdfResult.matchedProfileId,
    });
    setProfileSaved(true);
    setRememberStatementPrompt(false);
  };

  const matchedProfile = pdfResult?.matchedProfileId
    ? statementProfiles.find((p) => p.id === pdfResult.matchedProfileId)
    : undefined;

  return (
    <div className="page">
      <Header
        title="Import Statements"
        subtitle="Upload CSV, XLSX, or PDF files — processed entirely in your browser"
      />

      {error && <div className="alert alert-error">{error}</div>}

      {step === "upload" && (
        <section className="card">
          <FileUploader onFileSelect={handleFile} />
          <p className="help-text">
            Files are never uploaded to any server. All parsing happens locally on your device.
          </p>
          <div className="alert alert-warning">
            {PDF_IMPORT_WARNING}
          </div>
        </section>
      )}

      {step === "map" && parseResult && (
        <section className="card">
          <h2>Map columns</h2>
          <p className="help-text">
            Match your statement columns to the fields below. We&apos;ve guessed based on your headers.
            Map either <strong>Debit + Credit</strong> columns, or a single <strong>Amount</strong> column.
          </p>
          <div className="mapping-grid">
            {mappingFields.map(({ key, label }) => (
              <label key={key} className="form-field">
                <span>{label}</span>
                <select
                  value={mapping[key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [key]: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">— Not mapped —</option>
                  {parseResult.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h3>Preview (first 5 rows)</h3>
          <DataTable<ParsedRow>
            data={parseResult.rows.slice(0, 5)}
            keyField={(row) => JSON.stringify(row)}
            columns={parseResult.headers.slice(0, 6).map((h) => ({
              key: h,
              header: h,
              render: (row) => String(row[h] ?? ""),
            }))}
          />

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={
                categorising ||
                !mapping.date ||
                !mapping.description ||
                (!mapping.amount && !mapping.debit && !mapping.credit)
              }
            >
              {categorising ? "Categorising…" : "Preview import"}
            </button>
          </div>
        </section>
      )}

      {step === "pdf_review" && pdfResult && (
        <section className="card">
          <h2>Review extracted transactions</h2>
          <div className="alert alert-warning">{PDF_IMPORT_WARNING}</div>

          {pdfResult.usedLearnedProfile && matchedProfile && (
            <div className="alert alert-success">
              Recognised from your last import: <strong>{matchedProfile.label}</strong>
              {" "}
              ({accountTypeLabel(matchedProfile.accountType)}, {formatLabel(matchedProfile.statementFormat)}).
              Parser settings were applied automatically.
            </div>
          )}

          <div className="import-profile-fields">
            <label className="form-field">
              <span>Account name (on imported transactions)</span>
              <input
                type="text"
                value={importAccountName}
                onChange={(e) => setImportAccountName(e.target.value)}
                placeholder="e.g. Westpac Altitude"
              />
            </label>
            <label className="form-field">
              <span>Account type</span>
              <select
                value={importAccountType}
                onChange={(e) =>
                  setImportAccountType(e.target.value as FinancialAccountType)
                }
              >
                {accountTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {accountTypeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Statement format</span>
              <select
                value={importStatementFormat}
                onChange={(e) => {
                  const format = e.target.value as StatementFormat;
                  setImportStatementFormat(format);
                  setImportAccountType(accountTypeFromFormat(format));
                  void reparsePdfWithSettings(format, importAccountName);
                }}
              >
                {formatOptions.map((f) => (
                  <option key={f} value={f}>
                    {formatLabel(f)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="help-text">
            Adjust account type or statement format if detection looks wrong. Your choices can be saved after import for the next statement.
          </p>

          <StatementReconciliationCard
            stats={pdfResult.stats}
            summary={pdfResult.summary}
            reconciliation={pdfResult.reconciliation}
            statementReconciliation={pdfResult.statementReconciliation}
            transactionAmounts={pdfDrafts.map((d) => d.amount)}
            currency={settings.defaultCurrency}
          />

          <p className="help-text">
            Found {pdfDrafts.length} possible transactions
            {pdfResult.skippedLines > 0 &&
              ` (${pdfResult.skippedLines} lines skipped)`}
            {pdfResult.detectedFormat && pdfResult.detectedFormat !== "generic" && (
              <> — detected <span className="badge badge-info">{pdfResult.detectedFormat.replace(/_/g, " ")}</span></>
            )}
            {pdfResult.accountName && (
              <> for <strong>{pdfResult.accountName}</strong></>
            )}
            . Edit or remove rows before importing.
          </p>

          {pdfDrafts.length === 0 ? (
            <div className="pdf-empty-state">
              <p className="empty-table-message">
                No transactions could be auto-detected from this PDF. This is common — bank PDF layouts vary a lot.
              </p>
              <p className="help-text">
                Expand <strong>View extracted text</strong> below to see what was read from the file, then add transactions manually. Or export a CSV/XLSX from your bank for more reliable imports.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={addPdfDraft}>
                Add transaction manually
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pdfDrafts.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <input
                          type="date"
                          value={d.date}
                          onChange={(e) =>
                            updatePdfDraft(d.id, "date", e.target.value)
                          }
                          className="inline-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={d.description}
                          onChange={(e) =>
                            updatePdfDraft(d.id, "description", e.target.value)
                          }
                          className="inline-input inline-input--wide"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={d.amount}
                          onChange={(e) =>
                            updatePdfDraft(d.id, "amount", e.target.value)
                          }
                          className="inline-input"
                        />
                      </td>
                      <td>{d.balance != null ? formatCurrency(d.balance, settings.defaultCurrency) : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removePdfDraft(d.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="form-actions form-actions--tight">
            <button type="button" className="btn btn-secondary btn-sm" onClick={addPdfDraft}>
              Add row
            </button>
          </div>

          <details className="pdf-text-preview" open={pdfDrafts.length === 0}>
            <summary>View extracted text</summary>
            <pre>{pdfResult.rawText.slice(0, 4000)}{pdfResult.rawText.length > 4000 ? "…" : ""}</pre>
          </details>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePdfPreview}
              disabled={categorising || pdfDrafts.length === 0}
            >
              {categorising ? "Categorising…" : "Preview import"}
            </button>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section className="card">
          <h2>Confirm import</h2>

          {fileKind === "pdf" && pdfResult && (
            <StatementReconciliationCard
              stats={{
                ...pdfResult.stats,
                detectedTransactionCount: preview.length,
              }}
              summary={pdfResult.summary}
              reconciliation={pdfResult.reconciliation}
              statementReconciliation={pdfResult.statementReconciliation}
              transactionAmounts={preview.map((t) => t.amount)}
              currency={settings.defaultCurrency}
            />
          )}

          <div className="import-summary">
            <span>{preview.length} transactions found</span>
            {duplicates.length > 0 && (
              <span className="text-warning">
                {duplicates.length} possible duplicates (will be skipped)
              </span>
            )}
            {skipped > 0 && fileKind === "structured" && (
              <span>{skipped} rows skipped (missing date or amount)</span>
            )}
            <span className="badge badge-info">Auto-categorised locally</span>
          </div>

          <DataTable<Transaction>
            data={preview.slice(0, 20)}
            keyField="id"
            columns={[
              { key: "date", header: "Date" },
              { key: "description", header: "Description" },
              {
                key: "amount",
                header: "Amount",
                render: (t) => formatCurrency(t.amount, settings.defaultCurrency),
              },
              {
                key: "category",
                header: "Category",
                render: (t) => formatCategoryLabel(t.category, categories),
              },
              { key: "type", header: "Type" },
            ]}
            emptyMessage="No transactions to import."
          />
          {preview.length > 20 && (
            <p className="help-text">Showing first 20 of {preview.length} transactions.</p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(fileKind === "pdf" ? "pdf_review" : "map")}
            >
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={handleImport}>
              Import {Math.max(0, preview.length - duplicates.length)} transactions
            </button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="card card-success">
          <h2>Import complete</h2>
          <p>Successfully imported {importedCount} transactions.</p>

          {rememberStatementPrompt && pdfResult && !profileSaved && (
            <RememberRulePrompt
              label={`Remember "${importAccountName.trim() || formatLabel(importStatementFormat)}" (${accountTypeLabel(importAccountType)}) for your next ${formatLabel(importStatementFormat).toLowerCase()} upload?`}
              onRemember={handleRememberStatement}
              onDismiss={() => setRememberStatementPrompt(false)}
            />
          )}
          {profileSaved && (
            <p className="help-text">
              Saved — future statements that match this file or account will use the same parser and account type.
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={reset}>
              Import another file
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
