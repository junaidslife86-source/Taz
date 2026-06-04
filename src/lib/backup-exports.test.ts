import { describe, expect, it } from "vitest";
import {
  createEncryptedFullBackup,
  createStrippedDiagnosticBackup,
  createStatementTemplateBackup,
  isNonRestorableExportKind,
} from "./backup-exports";
import { decryptBackupEnvelope } from "./backup-crypto";
import { parseBackupForImport } from "./backup";

const baseState = () => ({
  transactions: [
    {
      id: "t1",
      date: "2025-01-01",
      description: "WOOLWORTHS SYDNEY",
      amount: -42.5,
      type: "expense" as const,
      category: "Groceries",
      accountName: "My Visa ****1234",
      sourceFile: "cc_jan.pdf",
      importedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "t2",
      date: "2025-01-02",
      description: "WOOLWORTHS SYDNEY",
      amount: -10,
      type: "expense" as const,
      category: "Groceries",
      importedAt: "2025-01-02T00:00:00.000Z",
    },
  ],
  assets: [
    {
      id: "a1",
      name: "Family home",
      assetType: "property" as const,
      value: 800_000,
      currency: "AUD",
      notes: "123 Main St",
      updatedAt: "2025-01-01",
    },
  ],
  liabilities: [],
  categories: [{ id: "c1", name: "Groceries", emoji: "🛒", isDefault: false }],
  categoryRules: [
    {
      id: "r1",
      keywords: ["woolworths"],
      category: "Groceries",
      isDefault: false,
      source: "user" as const,
      createdAt: "2025-01-01",
    },
  ],
  statementProfiles: [
    {
      id: "p1",
      label: "Westpac CC",
      accountName: "Altitude",
      statementFormat: "westpac_credit_card" as const,
      accountType: "credit_card" as const,
      fileNamePatterns: ["cc_"],
      textSignatures: ["mastercard"],
      importCount: 2,
      lastUsedAt: "2025-01-01",
      createdAt: "2025-01-01",
    },
  ],
  netWorthSnapshots: [],
  settings: {
    onboardingComplete: true,
    defaultCurrency: "AUD",
    aiAssistEnabled: false,
    geminiApiKey: "secret",
  },
});

describe("backup export modes", () => {
  it("strips PII and uses stable merchant pseudonyms", () => {
    const backup = createStrippedDiagnosticBackup(baseState());
    expect(backup.exportKind).toBe("diagnostic_stripped");
    expect(backup.transactions[0]?.merchantPseudonym).toBe(
      backup.transactions[1]?.merchantPseudonym,
    );
    expect(
      JSON.stringify(backup),
    ).not.toMatch(/WOOLWORTHS|Altitude|Family home|woolworths|secret|1234/i);
    expect(backup.transactions[0]).toMatchObject({
      date: "2025-01-01",
      amount: -42.5,
      category: "Groceries",
      type: "expense",
    });
    expect(backup.reconciliationSummary.transactionCount).toBe(2);
  });

  it("template export has no transactions", () => {
    const backup = createStatementTemplateBackup(baseState());
    expect(backup.exportKind).toBe("statement_templates");
    expect(backup.templates[0]?.statementFormat).toBe("westpac_credit_card");
    expect(backup.parserCatalog.parsingEdgeCases.length).toBeGreaterThan(0);
    expect(JSON.stringify(backup)).not.toMatch(/WOOLWORTHS|t1|Family home/i);
  });

  it("encrypted backup round-trips and excludes API key by default", async () => {
    const envelope = await createEncryptedFullBackup(
      baseState(),
      "test-password-123",
    );
    const plain = await decryptBackupEnvelope(envelope, "test-password-123");
    const parsed = parseBackupForImport(JSON.parse(plain));
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.settings.geminiApiKey).toBe("");
  });

  it("marks diagnostic and template exports as non-restorable", () => {
    expect(
      isNonRestorableExportKind(createStrippedDiagnosticBackup(baseState())),
    ).toBe(true);
    expect(
      isNonRestorableExportKind(createStatementTemplateBackup(baseState())),
    ).toBe(true);
  });
});
