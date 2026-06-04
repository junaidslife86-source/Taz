import type { BackupAppName } from "../constants/app";

export type CategorisationMethod =
  | "default_rule"
  | "user_rule"
  | "remembered_choice"
  | "recurring_pattern"
  | "manual"
  | "gemini";

export type CategorisationResult = {
  category: string;
  confidence: number;
  method: CategorisationMethod;
  explanation?: string;
};

export type CategoryRule = {
  id: string;
  keywords: string[];
  category: string;
  isDefault: boolean;
  source: "default" | "user" | "remembered";
  createdAt: string;
};

export type DraftTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
};

export type TransactionType = "income" | "expense" | "transfer";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountName?: string;
  sourceFile?: string;
  importedAt: string;
};

export type AssetType =
  | "cash"
  | "superannuation"
  | "stock"
  | "etf"
  | "property"
  | "vehicle"
  | "crypto"
  | "other";

export type Asset = {
  id: string;
  name: string;
  assetType: AssetType;
  value: number;
  currency: string;
  notes?: string;
  ticker?: string;
  units?: number;
  averageCost?: number;
  updatedAt: string;
};

export type LiabilityType =
  | "mortgage"
  | "credit_card"
  | "personal_loan"
  | "student_loan"
  | "car_loan"
  | "other";

export type RepaymentFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "yearly";

export type Liability = {
  id: string;
  name: string;
  liabilityType: LiabilityType;
  balance: number;
  interestRate?: number;
  repaymentAmount?: number;
  repaymentFrequency?: RepaymentFrequency;
  notes?: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  isDefault: boolean;
};

export type CategoryUpdate = {
  name?: string;
  emoji?: string;
};

export type NetWorthSnapshot = {
  id: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

/** `savings` = save for something; `debt` = pay down debt */
export type GoalKind = "savings" | "debt";

export type Goal = {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  /** Starting progress: already saved (savings) or already paid off (debt) */
  baselineAmount: number;
  monthlyPlan: number;
  targetDate?: string;
  linkedAssetIds: string[];
  linkedLiabilityIds: string[];
  linkedTransactionIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalEntryKind = "contribution" | "withdrawal";

export type GoalEntry = {
  id: string;
  goalId: string;
  date: string;
  amount: number;
  kind: GoalEntryKind;
  note?: string;
  createdAt: string;
};

export type AppSettings = {
  onboardingComplete: boolean;
  defaultCurrency: string;
  aiAssistEnabled: boolean;
  geminiApiKey: string;
};

export type BackupFile = {
  appName: BackupAppName;
  version: string;
  exportedAt: string;
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  categories: Category[];
  categoryRules: CategoryRule[];
  statementProfiles?: StatementProfile[];
  netWorthSnapshots: NetWorthSnapshot[];
  goals?: Goal[];
  goalEntries?: GoalEntry[];
  settings: AppSettings;
};

export type ColumnMapping = {
  date?: string;
  description?: string;
  debit?: string;
  credit?: string;
  amount?: string;
  balance?: string;
  accountName?: string;
};

/** Bank statement layout used for PDF/text parsing */
export type StatementFormat =
  | "westpac_credit_card"
  | "westpac_transaction"
  | "generic";

/** How this account behaves in your finances (for imports & net worth) */
export type FinancialAccountType =
  | "credit_card"
  | "transaction_account"
  | "savings"
  | "unknown";

/** Learned from a reviewed import — applied to similar future statements */
export type StatementProfile = {
  id: string;
  label: string;
  accountName: string;
  statementFormat: StatementFormat;
  accountType: FinancialAccountType;
  fileNamePatterns: string[];
  textSignatures: string[];
  importCount: number;
  lastUsedAt: string;
  createdAt: string;
};

/** Non-deletable fallback category for uncategorised transactions */
export const FALLBACK_CATEGORY = "Other";

/** Suggested categories on first run — all editable/deletable except FALLBACK_CATEGORY */
export const SEED_CATEGORIES = [
  "Income",
  "Salary",
  "Groceries",
  "Dining",
  "Transport",
  "Rent",
  "Mortgage",
  "Utilities",
  "Insurance",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Travel",
  "Education",
  "Subscriptions",
  "Investments",
  "Transfer",
] as const;

export function isFallbackCategory(category: { name: string }): boolean {
  return category.name.trim().toLowerCase() === FALLBACK_CATEGORY.toLowerCase();
}

export const APP_VERSION = "1.3.0";

export const PDF_IMPORT_WARNING =
  "Taz can try to read PDF statements, but PDF formats vary by bank. Please review imported transactions before saving.";

export const AI_ASSIST_PRIVACY_WARNING =
  "AI Assist is optional. When enabled, redacted transaction details are sent to Google Gemini using your own API key. Nothing is sent unless you turn this on and save a key. The app works fully without AI Assist.";

export const AI_ASSIST_CONSENT_TEXT =
  "AI Assist is not private or offline. Enabling it allows your browser to send transaction date, redacted description, and amount to Google Gemini when local rules cannot categorise a transaction.";

export const PRIVACY_STATEMENT =
  "Taz stores your financial data locally in your browser. Your data is not uploaded or shared unless you explicitly enable optional AI Assist with your own Gemini API key.";

export const DISCLAIMER =
  "Taz is a personal finance tracking tool. It does not provide financial advice. Values entered manually may become outdated. Always verify important financial decisions with qualified professionals.";
