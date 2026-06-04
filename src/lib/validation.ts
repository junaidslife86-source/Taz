import { z } from "zod";

export const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().finite("Amount must be a valid number"),
  type: z.enum(["income", "expense", "transfer"]),
  category: z.string().min(1, "Category is required"),
  accountName: z.string().optional(),
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

export const backupSchema = z.object({
  appName: z.literal("MyFinancePal"),
  version: z.string(),
  exportedAt: z.string(),
  transactions: z.array(z.any()),
  assets: z.array(z.any()),
  liabilities: z.array(z.any()),
  categories: z.array(z.any()),
  categoryRules: z.array(z.any()).optional(),
  statementProfiles: z.array(z.any()).optional(),
  netWorthSnapshots: z.array(z.any()),
  settings: z.object({
    onboardingComplete: z.boolean(),
    defaultCurrency: z.string(),
    aiAssistEnabled: z.boolean().optional(),
    geminiApiKey: z.string().optional(),
  }),
});

export const categoryRuleSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1),
  category: z.string().min(1),
});
