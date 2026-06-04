import { APP_VERSION } from "../types/finance";
import type {
  AppSettings,
  Asset,
  Category,
  CategoryRule,
  Liability,
  NetWorthSnapshot,
  StatementProfile,
  Transaction,
} from "../types/finance";
import {
  reconcileFromTransactions,
  sumCredits,
  sumDebits,
  type ReconciliationKind,
} from "./statement-formats/reconciliation";
import { accountTypeFromFormat } from "./statement-profiles";
import { PARSER_CATALOG } from "./parser-catalog";
import { createBackupExport, type BackupExportOptions } from "./backup";
import {
  encryptBackupPayload,
  type EncryptedBackupEnvelope,
} from "./backup-crypto";

export type BackupState = {
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  categories: Category[];
  categoryRules: CategoryRule[];
  statementProfiles: StatementProfile[];
  netWorthSnapshots: NetWorthSnapshot[];
  settings: AppSettings;
};

function normalizeMerchantKey(description: string): string {
  return description.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildStablePseudonymMap(
  values: string[],
  prefix: string,
): Map<string, string> {
  const unique = [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
  const map = new Map<string, string>();
  unique.forEach((value, index) => {
    map.set(value, `${prefix}_${String(index + 1).padStart(3, "0")}`);
  });
  return map;
}

export type StrippedDiagnosticBackup = {
  exportKind: "diagnostic_stripped";
  appName: "MyFinancePal";
  version: string;
  exportedAt: string;
  purpose: "support_debugging";
  transactions: Array<{
    date: string;
    amount: number;
    type: Transaction["type"];
    category: string;
    merchantPseudonym: string;
  }>;
  assets: Array<{
    pseudonym: string;
    assetType: Asset["assetType"];
    value: number;
    currency: string;
    updatedAt: string;
  }>;
  liabilities: Array<{
    pseudonym: string;
    liabilityType: Liability["liabilityType"];
    balance: number;
    interestRate?: number;
    repaymentAmount?: number;
    repaymentFrequency?: Liability["repaymentFrequency"];
    updatedAt: string;
  }>;
  categories: Category[];
  categoryRules: Array<{
    id: string;
    keywordPseudonyms: string[];
    category: string;
    isDefault: boolean;
    source: CategoryRule["source"];
    createdAt: string;
  }>;
  netWorthSnapshots: NetWorthSnapshot[];
  settings: Pick<AppSettings, "defaultCurrency" | "onboardingComplete">;
  reconciliationSummary: {
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
    dateRange: { earliest: string | null; latest: string | null };
    byFormat: Array<{
      statementFormat: StatementProfile["statementFormat"];
      reconciliationKind: ReconciliationKind;
      reconciliation: ReturnType<typeof reconcileFromTransactions>;
      transactionCount: number;
    }>;
  };
  parserConfidence: {
    categorisedAsOtherPercent: number;
    categoryRuleCount: number;
    statementProfileCount: number;
    note: string;
  };
};

export type StatementTemplateBackup = {
  exportKind: "statement_templates";
  appName: "MyFinancePal";
  version: string;
  exportedAt: string;
  purpose: "community_parser_sharing";
  templates: Array<{
    templateId: string;
    statementFormat: StatementProfile["statementFormat"];
    accountType: StatementProfile["accountType"];
    fileNamePatterns: string[];
    textSignatures: string[];
  }>;
  parserCatalog: typeof PARSER_CATALOG;
};

export function createStrippedDiagnosticBackup(
  state: BackupState,
): StrippedDiagnosticBackup {
  const merchantMap = buildStablePseudonymMap(
    state.transactions.map((t) => normalizeMerchantKey(t.description)),
    "MERCHANT",
  );

  const amounts = state.transactions.map((t) => t.amount);
  const dates = state.transactions.map((t) => t.date).sort();
  const otherCount = state.transactions.filter(
    (t) => t.category === "Other",
  ).length;

  const formatGroups = new Map<
    StatementProfile["statementFormat"],
    number[]
  >();
  for (const tx of state.transactions) {
    const profile = state.statementProfiles.find(
      (p) =>
        tx.sourceFile &&
        p.fileNamePatterns.some((pat) =>
          tx.sourceFile!.toLowerCase().includes(pat.toLowerCase()),
        ),
    );
    const format = profile?.statementFormat ?? "generic";
    const list = formatGroups.get(format) ?? [];
    list.push(tx.amount);
    formatGroups.set(format, list);
  }

  if (formatGroups.size === 0 && state.transactions.length > 0) {
    formatGroups.set("generic", amounts);
  }

  const byFormat = [...formatGroups.entries()].map(([statementFormat, amts]) => {
    const reconciliationKind: ReconciliationKind =
      statementFormat === "westpac_credit_card" ? "credit_card" : "transaction_account";
    return {
      statementFormat,
      reconciliationKind,
      reconciliation: reconcileFromTransactions(
        {
          openingBalance: null,
          totalCredits: null,
          totalDebits: null,
          closingBalance: null,
        },
        amts,
        reconciliationKind,
      ),
      transactionCount: amts.length,
    };
  });

  const keywordValues = state.categoryRules.flatMap((r) => r.keywords);
  const keywordMap = buildStablePseudonymMap(keywordValues, "KEYWORD");

  const assetMap = buildStablePseudonymMap(
    state.assets.map((a) => a.id),
    "ASSET",
  );
  const liabilityMap = buildStablePseudonymMap(
    state.liabilities.map((l) => l.id),
    "LIABILITY",
  );

  return {
    exportKind: "diagnostic_stripped",
    appName: "MyFinancePal",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    purpose: "support_debugging",
    transactions: state.transactions.map((t) => ({
      date: t.date,
      amount: t.amount,
      type: t.type,
      category: t.category,
      merchantPseudonym:
        merchantMap.get(normalizeMerchantKey(t.description)) ?? "MERCHANT_000",
    })),
    assets: state.assets.map((a) => ({
      pseudonym: assetMap.get(a.id) ?? "ASSET_000",
      assetType: a.assetType,
      value: a.value,
      currency: a.currency,
      updatedAt: a.updatedAt,
    })),
    liabilities: state.liabilities.map((l) => ({
      pseudonym: liabilityMap.get(l.id) ?? "LIABILITY_000",
      liabilityType: l.liabilityType,
      balance: l.balance,
      interestRate: l.interestRate,
      repaymentAmount: l.repaymentAmount,
      repaymentFrequency: l.repaymentFrequency,
      updatedAt: l.updatedAt,
    })),
    categories: state.categories,
    categoryRules: state.categoryRules.map((r) => ({
      id: r.id,
      keywordPseudonyms: r.keywords.map(
        (kw) => keywordMap.get(kw) ?? "KEYWORD_000",
      ),
      category: r.category,
      isDefault: r.isDefault,
      source: r.source,
      createdAt: r.createdAt,
    })),
    netWorthSnapshots: state.netWorthSnapshots,
    settings: {
      defaultCurrency: state.settings.defaultCurrency,
      onboardingComplete: state.settings.onboardingComplete,
    },
    reconciliationSummary: {
      totalCredits: sumCredits(amounts),
      totalDebits: sumDebits(amounts),
      transactionCount: state.transactions.length,
      dateRange: {
        earliest: dates[0] ?? null,
        latest: dates[dates.length - 1] ?? null,
      },
      byFormat,
    },
    parserConfidence: {
      categorisedAsOtherPercent:
        state.transactions.length === 0
          ? 0
          : Math.round((otherCount / state.transactions.length) * 1000) / 10,
      categoryRuleCount: state.categoryRules.length,
      statementProfileCount: state.statementProfiles.length,
      note: "Per-transaction parser confidence is not stored; aggregates and reconciliation totals are included instead.",
    },
  };
}

export function createStatementTemplateBackup(
  state: BackupState,
): StatementTemplateBackup {
  const templates = state.statementProfiles.map((p, index) => ({
    templateId: `TEMPLATE_${String(index + 1).padStart(3, "0")}`,
    statementFormat: p.statementFormat,
    accountType: p.accountType,
    fileNamePatterns: [...p.fileNamePatterns],
    textSignatures: [...p.textSignatures],
  }));

  const catalogTemplates =
    templates.length > 0
      ? templates
      : PARSER_CATALOG.bankDetectionRules.map((rule, index) => ({
          templateId: `BUILTIN_${String(index + 1).padStart(3, "0")}`,
          statementFormat: rule.format,
          accountType: accountTypeFromFormat(rule.format),
          fileNamePatterns: [...rule.filenameHints],
          textSignatures: [...rule.textSignatures],
        }));

  return {
    exportKind: "statement_templates",
    appName: "MyFinancePal",
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    purpose: "community_parser_sharing",
    templates: catalogTemplates,
    parserCatalog: PARSER_CATALOG,
  };
}

export async function createEncryptedFullBackup(
  state: BackupState,
  password: string,
  options?: BackupExportOptions,
): Promise<EncryptedBackupEnvelope> {
  const backup = createBackupExport(state, options);
  return encryptBackupPayload(JSON.stringify(backup), password, {
    version: APP_VERSION,
    exportedAt: backup.exportedAt,
  });
}

export function isNonRestorableExportKind(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const kind = (data as { exportKind?: string }).exportKind;
  return kind === "diagnostic_stripped" || kind === "statement_templates";
}

export function nonRestorableExportMessage(data: unknown): string {
  const kind = (data as { exportKind?: string }).exportKind;
  if (kind === "diagnostic_stripped") {
    return "Stripped diagnostic backups cannot be restored. Use a full encrypted backup for restore.";
  }
  if (kind === "statement_templates") {
    return "Statement template exports cannot be restored. Use a full encrypted backup for restore.";
  }
  return "This file is not a restorable backup.";
}