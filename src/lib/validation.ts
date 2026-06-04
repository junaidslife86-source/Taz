import { z } from "zod";
import { SUPPORTED_BACKUP_APP_NAMES } from "../constants/app";

const MAX_STRING = 500;
const MAX_DESC = 1_000;
const MAX_EMOJI = 16;
const MAX_KEYWORDS = 30;
const MAX_ARRAY_ITEMS = 10_000;
const MAX_TRANSACTIONS = 50_000;

const idSchema = z.string().min(1).max(64);
const shortText = z.string().min(1).max(MAX_STRING);
const optionalShortText = z.string().max(MAX_STRING).optional();
const isoDate = z
  .string()
  .max(32)
  .regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date format");

export const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().finite("Amount must be a valid number"),
  type: z.enum(["income", "expense", "transfer"]),
  category: z.string().min(1, "Category is required"),
  accountName: z.string().optional(),
});

export const transactionRecordSchema = z.object({
  id: idSchema,
  date: isoDate,
  description: z.string().min(1).max(MAX_DESC),
  amount: z.number().finite(),
  type: z.enum(["income", "expense", "transfer"]),
  category: shortText,
  accountName: optionalShortText,
  sourceFile: optionalShortText,
  importedAt: z.string().max(64),
});

export const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assetType: z.enum([
    "cash",
    "superannuation",
    "stock",
    "etf",
    "property",
    "vehicle",
    "crypto",
    "other",
  ]),
  value: z.number().min(0, "Value must be zero or greater"),
  currency: z.string().min(1),
  notes: z.string().optional(),
  ticker: z.string().optional(),
  units: z.number().optional(),
  averageCost: z.number().optional(),
});

export const assetRecordSchema = z.object({
  id: idSchema,
  name: shortText,
  assetType: assetSchema.shape.assetType,
  value: z.number().finite().min(0),
  currency: z.string().min(1).max(8),
  notes: optionalShortText,
  ticker: z.string().max(32).optional(),
  units: z.number().finite().optional(),
  averageCost: z.number().finite().optional(),
  updatedAt: z.string().max(64),
});

export const liabilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  liabilityType: z.enum([
    "mortgage",
    "credit_card",
    "personal_loan",
    "student_loan",
    "car_loan",
    "other",
  ]),
  balance: z.number().min(0, "Balance must be zero or greater"),
  interestRate: z.number().optional(),
  repaymentAmount: z.number().optional(),
  repaymentFrequency: z
    .enum(["weekly", "fortnightly", "monthly", "yearly"])
    .optional(),
  notes: z.string().optional(),
});

export const liabilityRecordSchema = z.object({
  id: idSchema,
  name: shortText,
  liabilityType: liabilitySchema.shape.liabilityType,
  balance: z.number().finite().min(0),
  interestRate: z.number().finite().min(0).optional(),
  repaymentAmount: z.number().finite().min(0).optional(),
  repaymentFrequency: liabilitySchema.shape.repaymentFrequency,
  notes: optionalShortText,
  updatedAt: z.string().max(64),
});

export const categoryRecordSchema = z.object({
  id: idSchema,
  name: shortText,
  emoji: z.string().max(MAX_EMOJI),
  isDefault: z.boolean(),
});

export const categoryRuleRecordSchema = z.object({
  id: idSchema,
  keywords: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(MAX_KEYWORDS),
  category: shortText,
  isDefault: z.boolean(),
  source: z.enum(["default", "user", "remembered"]),
  createdAt: z.string().max(64),
});

export const statementProfileRecordSchema = z.object({
  id: idSchema,
  label: shortText,
  accountName: z.string().max(MAX_STRING),
  statementFormat: z.enum([
    "westpac_credit_card",
    "westpac_transaction",
    "generic",
  ]),
  accountType: z.enum([
    "credit_card",
    "transaction_account",
    "savings",
    "unknown",
  ]),
  fileNamePatterns: z.array(z.string().max(64)).max(20),
  textSignatures: z.array(z.string().max(120)).max(20),
  importCount: z.number().int().min(0).max(1_000_000),
  lastUsedAt: z.string().max(64),
  createdAt: z.string().max(64),
});

export const snapshotRecordSchema = z.object({
  id: idSchema,
  date: isoDate,
  totalAssets: z.number().finite(),
  totalLiabilities: z.number().finite(),
  netWorth: z.number().finite(),
});

export const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  kind: z.enum(["savings", "debt"]),
  targetAmount: z.number().positive("Target amount must be greater than zero"),
  baselineAmount: z.number().min(0, "Amount must be zero or greater"),
  monthlyPlan: z.number().min(0, "Monthly plan must be zero or greater"),
  targetDate: z.string().optional(),
  linkedAssetIds: z.array(z.string().max(64)).max(50),
  linkedLiabilityIds: z.array(z.string().max(64)).max(50),
  linkedTransactionIds: z.array(z.string().max(64)).max(500),
  notes: z.string().max(MAX_DESC).optional(),
});

export const goalRecordSchema = z.object({
  id: idSchema,
  name: shortText,
  kind: goalSchema.shape.kind,
  targetAmount: z.number().finite().positive(),
  baselineAmount: z.number().finite().min(0),
  monthlyPlan: z.number().finite().min(0),
  targetDate: isoDate.optional(),
  linkedAssetIds: z.array(idSchema).max(50),
  linkedLiabilityIds: z.array(idSchema).max(50),
  linkedTransactionIds: z.array(idSchema).max(500),
  notes: optionalShortText,
  createdAt: z.string().max(64),
  updatedAt: z.string().max(64),
});

export const goalEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  kind: z.enum(["contribution", "withdrawal"]),
  note: z.string().max(MAX_DESC).optional(),
});

export const goalEntryRecordSchema = z.object({
  id: idSchema,
  goalId: idSchema,
  date: isoDate,
  amount: z.number().finite().positive(),
  kind: goalEntrySchema.shape.kind,
  note: optionalShortText,
  createdAt: z.string().max(64),
});

const backupSettingsSchema = z.object({
  onboardingComplete: z.boolean(),
  defaultCurrency: z.string().min(1).max(8),
  aiAssistEnabled: z.boolean().optional(),
  geminiApiKey: z.string().max(256).optional(),
});

export const strictBackupSchema = z
  .object({
    appName: z.enum(SUPPORTED_BACKUP_APP_NAMES),
    version: z.string().max(32),
    exportedAt: z.string().max(64),
    transactions: z.array(transactionRecordSchema).max(MAX_TRANSACTIONS),
    assets: z.array(assetRecordSchema).max(MAX_ARRAY_ITEMS),
    liabilities: z.array(liabilityRecordSchema).max(MAX_ARRAY_ITEMS),
    categories: z.array(categoryRecordSchema).max(MAX_ARRAY_ITEMS),
    categoryRules: z.array(categoryRuleRecordSchema).max(MAX_ARRAY_ITEMS).optional(),
    statementProfiles: z
      .array(statementProfileRecordSchema)
      .max(MAX_ARRAY_ITEMS)
      .optional(),
    netWorthSnapshots: z.array(snapshotRecordSchema).max(MAX_ARRAY_ITEMS),
    goals: z.array(goalRecordSchema).max(MAX_ARRAY_ITEMS).optional(),
    goalEntries: z.array(goalEntryRecordSchema).max(MAX_ARRAY_ITEMS).optional(),
    settings: backupSettingsSchema,
  })
  .strict();

export type StrictBackup = z.infer<typeof strictBackupSchema>;

export function parseStrictBackup(data: unknown): StrictBackup {
  const result = strictBackupSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "backup";
    throw new Error(
      `Invalid backup file at ${path}: ${issue?.message ?? "validation failed"}`,
    );
  }
  return result.data;
}

/** @deprecated Use strictBackupSchema — kept for type re-exports */
export const backupSchema = strictBackupSchema;

export const categoryRuleSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1),
  category: z.string().min(1),
});
