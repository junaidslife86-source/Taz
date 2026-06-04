import { describe, expect, it } from "vitest";
import { APP_NAME, APP_NAME_LEGACY } from "../constants/app";
import { createBackupExport, parseBackupForImport } from "./backup";

const baseState = () => ({
  transactions: [
    {
      id: "t1",
      date: "2025-01-01",
      description: "Test",
      amount: -10,
      type: "expense" as const,
      category: "Other",
      importedAt: "2025-01-01T00:00:00.000Z",
    },
  ],
  assets: [],
  liabilities: [],
  categories: [
    { id: "c1", name: "Other", emoji: "📦", isDefault: true },
  ],
  categoryRules: [],
  statementProfiles: [],
  netWorthSnapshots: [],
  settings: {
    onboardingComplete: true,
    defaultCurrency: "AUD",
    aiAssistEnabled: true,
    geminiApiKey: "secret-key-should-not-export",
  },
});

describe("backup security", () => {
  it("exports with current app name", () => {
    const backup = createBackupExport(baseState());
    expect(backup.appName).toBe(APP_NAME);
  });

  it("excludes geminiApiKey from export by default", () => {
    const backup = createBackupExport(baseState());
    expect(backup.settings.geminiApiKey).toBe("");
  });

  it("includes geminiApiKey only when opted in", () => {
    const backup = createBackupExport(baseState(), { includeGeminiApiKey: true });
    expect(backup.settings.geminiApiKey).toBe("secret-key-should-not-export");
  });

  it("rejects malicious backup with prototype pollution keys", () => {
    const malicious = {
      appName: "MyFinancePal",
      version: "1.0",
      exportedAt: "2025-01-01",
      transactions: [],
      assets: [],
      liabilities: [],
      categories: [],
      netWorthSnapshots: [],
      settings: { onboardingComplete: true, defaultCurrency: "AUD" },
      __proto__: { polluted: true },
    };
    expect(() => parseBackupForImport(malicious)).toThrow();
  });

  it("rejects backup with invalid transaction shape", () => {
    const malicious = {
      appName: "MyFinancePal",
      version: "1.0",
      exportedAt: "2025-01-01",
      transactions: [{ id: "x", amount: "not-a-number" }],
      assets: [],
      liabilities: [],
      categories: [],
      netWorthSnapshots: [],
      settings: { onboardingComplete: true, defaultCurrency: "AUD" },
    };
    expect(() => parseBackupForImport(malicious)).toThrow(/Invalid backup/);
  });

  it("never restores geminiApiKey from backup on import", () => {
    const backup = createBackupExport(baseState(), { includeGeminiApiKey: true });
    const restored = parseBackupForImport(backup);
    expect(restored.settings.geminiApiKey).toBe("");
    expect(restored.settings.aiAssistEnabled).toBe(false);
  });

  it("imports legacy MyFinancePal backups", () => {
    const legacy = {
      appName: APP_NAME_LEGACY,
      version: "1.0",
      exportedAt: "2025-01-01",
      transactions: baseState().transactions,
      assets: [],
      liabilities: [],
      categories: baseState().categories,
      netWorthSnapshots: [],
      settings: {
        onboardingComplete: true,
        defaultCurrency: "AUD",
        aiAssistEnabled: false,
        geminiApiKey: "",
      },
    };
    const restored = parseBackupForImport(legacy);
    expect(restored.transactions).toHaveLength(1);
  });
});
