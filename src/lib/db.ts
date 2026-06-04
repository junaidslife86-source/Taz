import Dexie, { type Table } from "dexie";
import { INDEXED_DB_NAME } from "../constants/app";
import type {
  AppSettings,
  Asset,
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
  defaultEmojiForName,
  normalizeEmoji,
} from "./category-display";
import {
  FALLBACK_CATEGORY,
  isFallbackCategory,
  SEED_CATEGORIES,
} from "../types/finance";
import { defaultCategoryRules } from "./categorisation-rules";

export class FinanceDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  assets!: Table<Asset, string>;
  liabilities!: Table<Liability, string>;
  categories!: Table<Category, string>;
  categoryRules!: Table<CategoryRule, string>;
  statementProfiles!: Table<StatementProfile, string>;
  netWorthSnapshots!: Table<NetWorthSnapshot, string>;
  goals!: Table<Goal, string>;
  goalEntries!: Table<GoalEntry, string>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super(INDEXED_DB_NAME);
    this.version(1).stores({
      transactions: "id, date, category, type, importedAt",
      assets: "id, assetType, updatedAt",
      liabilities: "id, liabilityType, updatedAt",
      categories: "id, name",
      netWorthSnapshots: "id, date",
      settings: "id",
    });
    this.version(2).stores({
      transactions: "id, date, category, type, importedAt",
      assets: "id, assetType, updatedAt",
      liabilities: "id, liabilityType, updatedAt",
      categories: "id, name",
      categoryRules: "id, category, source",
      netWorthSnapshots: "id, date",
      settings: "id",
    });
    this.version(3).stores({
      transactions: "id, date, category, type, importedAt",
      assets: "id, assetType, updatedAt",
      liabilities: "id, liabilityType, updatedAt",
      categories: "id, name",
      categoryRules: "id, category, source",
      statementProfiles: "id, accountName, lastUsedAt",
      netWorthSnapshots: "id, date",
      settings: "id",
    });
    this.version(4).stores({
      transactions: "id, date, category, type, importedAt",
      assets: "id, assetType, updatedAt",
      liabilities: "id, liabilityType, updatedAt",
      categories: "id, name",
      categoryRules: "id, category, source",
      statementProfiles: "id, accountName, lastUsedAt",
      netWorthSnapshots: "id, date",
      goals: "id, kind, targetDate, updatedAt",
      goalEntries: "id, goalId, date",
      settings: "id",
    });
  }
}

export const db = new FinanceDatabase();

const DEFAULT_SETTINGS: AppSettings = {
  onboardingComplete: false,
  defaultCurrency: "AUD",
  aiAssistEnabled: false,
  geminiApiKey: "",
};

/** Remove duplicate category rows (same name, different ids) — keeps default row when present */
export async function deduplicateCategories(): Promise<void> {
  const all = await db.categories.toArray();
  const byName = new Map<string, Category[]>();

  for (const cat of all) {
    const key = cat.name.toLowerCase().trim();
    const group = byName.get(key) ?? [];
    group.push(cat);
    byName.set(key, group);
  }

  const toDelete: string[] = [];
  for (const group of byName.values()) {
    if (group.length <= 1) continue;
    group.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
    for (let i = 1; i < group.length; i++) {
      toDelete.push(group[i].id);
    }
  }

  if (toDelete.length > 0) {
    await db.categories.bulkDelete(toDelete);
  }
}

async function ensureFallbackCategory(): Promise<void> {
  const existing = await db.categories.toArray();
  const hasOther = existing.some((c) => isFallbackCategory(c));
  if (!hasOther) {
    await db.categories.add({
      id: crypto.randomUUID(),
      name: FALLBACK_CATEGORY,
      emoji: defaultEmojiForName(FALLBACK_CATEGORY),
      isDefault: true,
    });
  }
}

async function ensureSeedCategories(): Promise<void> {
  const existing = await db.categories.toArray();
  const names = new Set(existing.map((c) => c.name.toLowerCase().trim()));
  const missing = SEED_CATEGORIES.filter(
    (name) => !names.has(name.toLowerCase()),
  );
  if (missing.length === 0) return;

  await db.categories.bulkAdd(
    missing.map((name) => ({
      id: crypto.randomUUID(),
      name,
      emoji: defaultEmojiForName(name),
      isDefault: false,
    })),
  );
}

async function ensureCategoryEmojis(): Promise<void> {
  const all = await db.categories.toArray();
  await Promise.all(
    all.map((cat) => {
      const emoji = cat.emoji?.trim()
        ? normalizeEmoji(cat.emoji)
        : defaultEmojiForName(cat.name);
      if (cat.emoji === emoji) return Promise.resolve();
      return db.categories.put({ ...cat, emoji });
    }),
  );
}

/** Only "Other" stays protected; legacy rows marked default are cleared */
async function normalizeCategoryFlags(): Promise<void> {
  const all = await db.categories.toArray();
  await Promise.all(
    all.map((cat) => {
      const shouldBeDefault = isFallbackCategory(cat);
      if (cat.isDefault === shouldBeDefault) return Promise.resolve();
      return db.categories.put({ ...cat, isDefault: shouldBeDefault });
    }),
  );
}

export async function initializeDatabase(): Promise<void> {
  await ensureFallbackCategory();
  await ensureSeedCategories();
  await deduplicateCategories();
  await normalizeCategoryFlags();
  await ensureCategoryEmojis();

  const ruleCount = await db.categoryRules.count();
  if (ruleCount === 0) {
    await db.categoryRules.bulkAdd(
      defaultCategoryRules.map((rule) => ({
        ...rule,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      })),
    );
  }

  const settings = await db.settings.get("app");
  if (!settings) {
    await db.settings.put({ id: "app", ...DEFAULT_SETTINGS });
  } else {
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };
    if (
      merged.aiAssistEnabled !== settings.aiAssistEnabled ||
      merged.geminiApiKey !== settings.geminiApiKey ||
      merged.onboardingComplete !== settings.onboardingComplete ||
      merged.defaultCurrency !== settings.defaultCurrency
    ) {
      await db.settings.put({ id: "app", ...merged });
    }
  }
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get("app");
  return settings
    ? { ...DEFAULT_SETTINGS, ...settings }
    : DEFAULT_SETTINGS;
}

export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ id: "app", ...current, ...partial });
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.transactions.clear(),
    db.assets.clear(),
    db.liabilities.clear(),
    db.categories.clear(),
    db.categoryRules.clear(),
    db.statementProfiles.clear(),
    db.netWorthSnapshots.clear(),
    db.goals.clear(),
    db.goalEntries.clear(),
  ]);
  await initializeDatabase();
}
