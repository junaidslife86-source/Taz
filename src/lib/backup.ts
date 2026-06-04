import { APP_NAME } from "../constants/app";
import { APP_VERSION } from "../types/finance";
import type {
  AppSettings,
  Asset,
  BackupFile,
  Category,
  CategoryRule,
  Goal,
  GoalEntry,
  Liability,
  NetWorthSnapshot,
  StatementProfile,
  Transaction,
} from "../types/finance";
import {
  decryptBackupEnvelope,
  isEncryptedBackupEnvelope,
} from "./backup-crypto";
import {
  isNonRestorableExportKind,
  nonRestorableExportMessage,
} from "./backup-exports";
import {
  assertBackupJsonSize,
  ImportLimitError,
} from "./security-limits";
import { parseStrictBackup, type StrictBackup } from "./validation";

export {
  createEncryptedFullBackup,
  createStrippedDiagnosticBackup,
  createStatementTemplateBackup,
  type BackupState,
  type StatementTemplateBackup,
  type StrippedDiagnosticBackup,
} from "./backup-exports";
export {
  assertBackupPassword,
  type EncryptedBackupEnvelope,
} from "./backup-crypto";

export type BackupExportOptions = {
  /** Not recommended — API keys must not be shared in backups */
  includeGeminiApiKey?: boolean;
};

export function createBackupExport(
  state: {
    transactions: Transaction[];
    assets: Asset[];
    liabilities: Liability[];
    categories: Category[];
    categoryRules: CategoryRule[];
    statementProfiles: StatementProfile[];
    netWorthSnapshots: NetWorthSnapshot[];
    goals?: Goal[];
    goalEntries?: GoalEntry[];
    settings: AppSettings;
  },
  options?: BackupExportOptions,
): BackupFile {
  const settings: AppSettings & { geminiApiKey?: string } = {
    onboardingComplete: state.settings.onboardingComplete,
    defaultCurrency: state.settings.defaultCurrency,
    aiAssistEnabled: state.settings.aiAssistEnabled,
    geminiApiKey: "",
  };

  if (options?.includeGeminiApiKey && state.settings.geminiApiKey.trim()) {
    settings.geminiApiKey = state.settings.geminiApiKey.trim();
  }

  return {
    appName: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    assets: state.assets,
    liabilities: state.liabilities,
    categories: state.categories,
    categoryRules: state.categoryRules,
    statementProfiles: state.statementProfiles,
    netWorthSnapshots: state.netWorthSnapshots,
    goals: state.goals ?? [],
    goalEntries: state.goalEntries ?? [],
    settings: settings as AppSettings,
  };
}

export type RestoredBackup = StrictBackup & {
  settings: AppSettings;
};

/**
 * Validates backup JSON strictly. Never restores Gemini API keys from backups.
 */
export function parseBackupForImport(data: unknown): RestoredBackup {
  const parsed = parseStrictBackup(data);
  return {
    ...parsed,
    settings: {
      onboardingComplete: parsed.settings.onboardingComplete,
      defaultCurrency: parsed.settings.defaultCurrency,
      aiAssistEnabled: false,
      geminiApiKey: "",
    },
  };
}

export async function readBackupJsonFile(file: File): Promise<unknown> {
  if (!file.name.toLowerCase().endsWith(".json")) {
    throw new ImportLimitError("Backup must be a .json file.");
  }
  assertBackupJsonSize(file.size);
  const text = await file.text();
  assertBackupJsonSize(new TextEncoder().encode(text).length);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ImportLimitError("Backup file is not valid JSON.");
  }
}

/** Resolves encrypted or plain backup JSON into importable payload. */
export async function resolveBackupForImport(
  data: unknown,
  password?: string,
): Promise<unknown> {
  if (isNonRestorableExportKind(data)) {
    throw new ImportLimitError(nonRestorableExportMessage(data));
  }

  if (isEncryptedBackupEnvelope(data)) {
    if (!password?.trim()) {
      throw new ImportLimitError(
        "This backup is encrypted. Enter the backup password to restore.",
      );
    }
    const plaintext = await decryptBackupEnvelope(data, password);
    assertBackupJsonSize(new TextEncoder().encode(plaintext).length);
    try {
      return JSON.parse(plaintext) as unknown;
    } catch {
      throw new ImportLimitError("Decrypted backup is not valid JSON.");
    }
  }

  return data;
}

export async function readAndValidateBackupFile(
  file: File,
  password?: string,
): Promise<unknown> {
  const data = await readBackupJsonFile(file);
  return resolveBackupForImport(data, password);
}
