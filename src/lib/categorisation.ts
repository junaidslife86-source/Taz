import type {
  CategorisationResult,
  CategoryRule,
  Transaction,
} from "../types/finance";
import { FALLBACK_CATEGORY } from "../types/finance";
import {
  defaultCategoryRules,
  extractKeyword,
  matchesKeywords,
  normalizeDescription,
} from "./categorisation-rules";
export type CategorisationInput = {
  description: string;
  amount: number;
  date: string;
};

export type CategorisationContext = {
  userRules: CategoryRule[];
  existingTransactions: Transaction[];
  aiAssistEnabled: boolean;
  geminiApiKey: string;
};

export type CategoriseOptions = {
  /** Skip Gemini during bulk import preview (faster, local rules only) */
  localOnly?: boolean;
};

function ruleResult(
  category: string,
  confidence: number,
  method: CategorisationResult["method"],
  explanation?: string,
): CategorisationResult {
  return { category, confidence, method, explanation };
}

function matchRules(
  description: string,
  rules: CategoryRule[],
  method: CategorisationResult["method"],
  baseConfidence: number,
): CategorisationResult | null {
  for (const rule of rules) {
    if (matchesKeywords(description, rule.keywords)) {
      const confidence =
        method === "user_rule" || method === "remembered_choice"
          ? Math.min(0.98, baseConfidence + 0.1)
          : baseConfidence;
      return ruleResult(
        rule.category,
        confidence,
        method,
        `Matched rule: ${rule.keywords.join(", ")} → ${rule.category}`,
      );
    }
  }
  return null;
}

function detectRecurringCategory(
  input: CategorisationInput,
  transactions: Transaction[],
): CategorisationResult | null {
  const normalized = normalizeDescription(input.description);
  const similar = transactions.filter(
    (t) => normalizeDescription(t.description) === normalized,
  );
  if (similar.length < 2) return null;

  const categoryCounts = new Map<string, number>();
  for (const t of similar) {
    categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  }

  let bestCategory = "";
  let bestCount = 0;
  for (const [cat, count] of categoryCounts) {
    if (count > bestCount) {
      bestCategory = cat;
      bestCount = count;
    }
  }

  if (!bestCategory || bestCount < 2) return null;

  const confidence = Math.min(0.95, 0.7 + bestCount * 0.05);
  return ruleResult(
    bestCategory,
    confidence,
    "recurring_pattern",
    `Recurring transaction seen ${bestCount} times as ${bestCategory}`,
  );
}

export async function categoriseTransaction(
  input: CategorisationInput,
  context: CategorisationContext,
  options?: CategoriseOptions,
): Promise<CategorisationResult> {
  const userRules = context.userRules.filter((r) => r.source === "user");
  const rememberedRules = context.userRules.filter(
    (r) => r.source === "remembered",
  );
  const defaultRules = context.userRules.filter((r) => r.source === "default");

  const userMatch = matchRules(input.description, userRules, "user_rule", 0.92);
  if (userMatch) return userMatch;

  const rememberedMatch = matchRules(
    input.description,
    rememberedRules,
    "remembered_choice",
    0.9,
  );
  if (rememberedMatch) return rememberedMatch;

  const recurring = detectRecurringCategory(input, context.existingTransactions);
  if (recurring) return recurring;

  const defaultMatch = matchRules(
    input.description,
    defaultRules.length > 0
      ? defaultRules
      : defaultCategoryRules.map((r, i) => ({
          ...r,
          id: `default-${i}`,
          createdAt: "",
        })),
    "default_rule",
    0.75,
  );
  if (defaultMatch) return defaultMatch;

  if (
    !options?.localOnly &&
    context.aiAssistEnabled &&
    context.geminiApiKey.trim()
  ) {
    try {
      const { categoriseWithGemini } = await import("./gemini");
      const gemini = await categoriseWithGemini(input, context.geminiApiKey);
      if (gemini) return gemini;
    } catch {
      // fall through to local fallback
    }
  }

  const fallbackCategory = input.amount >= 0 ? "Income" : FALLBACK_CATEGORY;
  return ruleResult(
    fallbackCategory,
    0.2,
    "default_rule",
    "No matching rule found",
  );
}

export async function categoriseTransactions(
  inputs: CategorisationInput[],
  context: CategorisationContext,
  options?: CategoriseOptions,
): Promise<CategorisationResult[]> {
  const results: CategorisationResult[] = [];
  const augmentedTransactions = [...context.existingTransactions];

  for (const input of inputs) {
    const result = await categoriseTransaction(
      input,
      {
        ...context,
        existingTransactions: augmentedTransactions,
      },
      options,
    );
    results.push(result);
    augmentedTransactions.push({
      id: crypto.randomUUID(),
      date: input.date,
      description: input.description,
      amount: input.amount,
      type: input.amount >= 0 ? "income" : "expense",
      category: result.category,
      importedAt: new Date().toISOString(),
    });
  }

  return results;
}

export function suggestRememberRule(
  description: string,
  category: string,
): { keywords: string[]; category: string; label: string } {
  const keyword = extractKeyword(description);
  return {
    keywords: [keyword],
    category,
    label: `If a transaction contains "${keyword.toUpperCase()}", always categorise it as ${category}.`,
  };
}

export function createRememberedRule(
  keywords: string[],
  category: string,
): CategoryRule {
  return {
    id: crypto.randomUUID(),
    keywords: keywords.map((k) => k.toLowerCase()),
    category,
    isDefault: false,
    source: "remembered",
    createdAt: new Date().toISOString(),
  };
}

export function createUserRule(keywords: string[], category: string): CategoryRule {
  return {
    id: crypto.randomUUID(),
    keywords: keywords.map((k) => k.toLowerCase()),
    category,
    isDefault: false,
    source: "user",
    createdAt: new Date().toISOString(),
  };
}
