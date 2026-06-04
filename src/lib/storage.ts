import { create } from "zustand";
import {
  db,
  getSettings,
  updateSettings,
  clearAllData,
  initializeDatabase,
} from "./db";
import type {
  AppSettings,
  Asset,
  BackupFile,
  CategorisationResult,
  Category,
  CategoryRule,
  Liability,
  NetWorthSnapshot,
  StatementProfile,
  Transaction,
} from "../types/finance";
import { createStatementProfile } from "./statement-profiles";
import {
  APP_VERSION,
  FALLBACK_CATEGORY,
  isFallbackCategory,
  type CategoryUpdate,
} from "../types/finance";
import { defaultEmojiForName, normalizeEmoji } from "./category-display";
import { backupSchema } from "./validation";
import {
  categoriseTransactions,
  createRememberedRule,
  createUserRule,
  type CategorisationInput,
} from "./categorisation";

type FinanceState = {
  initialized: boolean;
  transactions: Transaction[];
  assets: Asset[];
  liabilities: Liability[];
  categories: Category[];
  categoryRules: CategoryRule[];
  statementProfiles: StatementProfile[];
  netWorthSnapshots: NetWorthSnapshot[];
  settings: AppSettings;
  initialize: () => Promise<void>;
  loadAll: () => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  addTransactions: (ts: Transaction[]) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAsset: (a: Asset) => Promise<void>;
  updateAsset: (a: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  addLiability: (l: Liability) => Promise<void>;
  updateLiability: (l: Liability) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  addCategory: (name: string, emoji?: string) => Promise<void>;
  updateCategory: (id: string, updates: CategoryUpdate) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCategoryRule: (rule: CategoryRule) => Promise<void>;
  deleteCategoryRule: (id: string) => Promise<void>;
  saveStatementProfile: (input: {
    accountName: string;
    statementFormat: StatementProfile["statementFormat"];
    accountType: StatementProfile["accountType"];
    filename: string;
    statementText: string;
    profileId?: string;
  }) => Promise<StatementProfile>;
  deleteStatementProfile: (id: string) => Promise<void>;
  rememberCategoryRule: (keywords: string[], category: string) => Promise<void>;
  categoriseInputs: (
    inputs: CategorisationInput[],
    options?: { localOnly?: boolean },
  ) => Promise<CategorisationResult[]>;
  categoriseAndApply: (
    inputs: CategorisationInput[],
    options?: { localOnly?: boolean },
  ) => Promise<Transaction[]>;
  addSnapshot: (s: NetWorthSnapshot) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  setOnboardingComplete: (complete: boolean) => Promise<void>;
  updateAppSettings: (partial: Partial<AppSettings>) => Promise<void>;
  exportBackup: () => BackupFile;
  importBackup: (data: unknown) => Promise<void>;
  clearData: () => Promise<void>;
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  initialized: false,
  transactions: [],
  assets: [],
  liabilities: [],
  categories: [],
  categoryRules: [],
  statementProfiles: [],
  netWorthSnapshots: [],
  settings: {
    onboardingComplete: false,
    defaultCurrency: "AUD",
    aiAssistEnabled: false,
    geminiApiKey: "",
  },

  initialize: async () => {
    await initializeDatabase();
    const settings = await getSettings();
    set({ settings, initialized: true });
    await get().loadAll();
  },

  loadAll: async () => {
    const [
      transactions,
      assets,
      liabilities,
      categories,
      categoryRules,
      statementProfiles,
      netWorthSnapshots,
      settings,
    ] = await Promise.all([
      db.transactions.orderBy("date").reverse().toArray(),
      db.assets.toArray(),
      db.liabilities.toArray(),
      db.categories.orderBy("name").toArray(),
      db.categoryRules.toArray(),
      db.statementProfiles.orderBy("lastUsedAt").reverse().toArray(),
      db.netWorthSnapshots.orderBy("date").reverse().toArray(),
      getSettings(),
    ]);
    set({
      transactions,
      assets,
      liabilities,
      categories,
      categoryRules,
      statementProfiles,
      netWorthSnapshots,
      settings,
    });
  },

  addTransaction: async (t) => {
    await db.transactions.put(t);
    await get().loadAll();
  },

  addTransactions: async (ts) => {
    await db.transactions.bulkPut(ts);
    await get().loadAll();
  },

  updateTransaction: async (t) => {
    await db.transactions.put(t);
    await get().loadAll();
  },

  deleteTransaction: async (id) => {
    await db.transactions.delete(id);
    await get().loadAll();
  },

  addAsset: async (a) => {
    await db.assets.put(a);
    await get().loadAll();
  },

  updateAsset: async (a) => {
    await db.assets.put(a);
    await get().loadAll();
  },

  deleteAsset: async (id) => {
    await db.assets.delete(id);
    await get().loadAll();
  },

  addLiability: async (l) => {
    await db.liabilities.put(l);
    await get().loadAll();
  },

  updateLiability: async (l) => {
    await db.liabilities.put(l);
    await get().loadAll();
  },

  deleteLiability: async (id) => {
    await db.liabilities.delete(id);
    await get().loadAll();
  },

  addCategory: async (name, emoji) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === FALLBACK_CATEGORY.toLowerCase()) return;
    const exists = get().categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;
    await db.categories.put({
      id: crypto.randomUUID(),
      name: trimmed,
      emoji: emoji !== undefined ? normalizeEmoji(emoji) : defaultEmojiForName(trimmed),
      isDefault: false,
    });
    await get().loadAll();
  },

  updateCategory: async (id, updates) => {
    const cat = get().categories.find((c) => c.id === id);
    if (!cat) return;

    const fallback = isFallbackCategory(cat);
    const nextName =
      updates.name !== undefined ? updates.name.trim() : cat.name;
    const nextEmoji =
      updates.emoji !== undefined
        ? normalizeEmoji(updates.emoji)
        : cat.emoji ?? "";

    if (!nextName && !fallback) return;
    if (fallback && updates.name !== undefined && updates.name.trim() !== cat.name) {
      return;
    }
    if (
      !fallback &&
      nextName.toLowerCase() === FALLBACK_CATEGORY.toLowerCase()
    ) {
      return;
    }
    if (
      get().categories.some(
        (c) => c.id !== id && c.name.toLowerCase() === nextName.toLowerCase(),
      )
    ) {
      return;
    }

    const nameChanged = !fallback && nextName !== cat.name;
    const emojiChanged = nextEmoji !== (cat.emoji ?? "");
    if (!nameChanged && !emojiChanged) return;

    await db.categories.put({
      ...cat,
      name: fallback ? cat.name : nextName,
      emoji: nextEmoji,
      isDefault: fallback,
    });

    if (nameChanged) {
      const oldName = cat.name;
      const transactions = await db.transactions.toArray();
      const txUpdates = transactions
        .filter((t) => t.category === oldName)
        .map((t) => ({ ...t, category: nextName }));
      if (txUpdates.length > 0) {
        await db.transactions.bulkPut(txUpdates);
      }

      const rules = get().categoryRules.filter((r) => r.category === oldName);
      if (rules.length > 0) {
        await db.categoryRules.bulkPut(
          rules.map((r) => ({ ...r, category: nextName })),
        );
      }
    }

    await get().loadAll();
  },

  deleteCategory: async (id) => {
    const cat = get().categories.find((c) => c.id === id);
    if (!cat || isFallbackCategory(cat)) return;

    const transactions = await db.transactions.toArray();
    const txUpdates = transactions
      .filter((t) => t.category === cat.name)
      .map((t) => ({ ...t, category: FALLBACK_CATEGORY }));
    if (txUpdates.length > 0) {
      await db.transactions.bulkPut(txUpdates);
    }

    await db.categories.delete(id);
    await get().loadAll();
  },

  addCategoryRule: async (rule) => {
    await db.categoryRules.put(rule);
    await get().loadAll();
  },

  deleteCategoryRule: async (id) => {
    const rule = get().categoryRules.find((r) => r.id === id);
    if (!rule || rule.isDefault) return;
    await db.categoryRules.delete(id);
    await get().loadAll();
  },

  saveStatementProfile: async (input) => {
    const existing = input.profileId
      ? get().statementProfiles.find((p) => p.id === input.profileId)
      : get().statementProfiles.find(
          (p) =>
            p.accountName.toLowerCase() === input.accountName.trim().toLowerCase() &&
            p.statementFormat === input.statementFormat,
        );
    const profile = createStatementProfile({
      ...input,
      existing,
    });
    await db.statementProfiles.put(profile);
    await get().loadAll();
    return profile;
  },

  deleteStatementProfile: async (id) => {
    await db.statementProfiles.delete(id);
    await get().loadAll();
  },

  rememberCategoryRule: async (keywords, category) => {
    const rule = createRememberedRule(keywords, category);
    const existing = get().categoryRules.find(
      (r) =>
        r.source === "remembered" &&
        r.category === category &&
        r.keywords.join("|") === rule.keywords.join("|"),
    );
    if (existing) return;
    await db.categoryRules.put(rule);
    await get().loadAll();
  },

  categoriseInputs: async (inputs, options) => {
    const state = get();
    return categoriseTransactions(
      inputs,
      {
        userRules: state.categoryRules ?? [],
        existingTransactions: state.transactions,
        aiAssistEnabled: state.settings.aiAssistEnabled ?? false,
        geminiApiKey: state.settings.geminiApiKey ?? "",
      },
      options,
    );
  },

  categoriseAndApply: async (inputs, options) => {
    const results = await get().categoriseInputs(inputs, options);

    const now = new Date().toISOString();
    return inputs.map((input, i) => ({
      id: crypto.randomUUID(),
      date: input.date,
      description: input.description,
      amount: input.amount,
      type:
        input.amount >= 0
          ? ("income" as const)
          : ("expense" as const),
      category: results[i]?.category ?? "Other",
      importedAt: now,
    }));
  },

  addSnapshot: async (s) => {
    await db.netWorthSnapshots.put(s);
    await get().loadAll();
  },

  deleteSnapshot: async (id) => {
    await db.netWorthSnapshots.delete(id);
    await get().loadAll();
  },

  setOnboardingComplete: async (complete) => {
    await updateSettings({ onboardingComplete: complete });
    const settings = await getSettings();
    set({ settings });
  },

  updateAppSettings: async (partial) => {
    await updateSettings(partial);
    const settings = await getSettings();
    set({ settings });
  },

  exportBackup: () => {
    const state = get();
    return {
      appName: "MyFinancePal" as const,
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      transactions: state.transactions,
      assets: state.assets,
      liabilities: state.liabilities,
      categories: state.categories,
      categoryRules: state.categoryRules,
      statementProfiles: state.statementProfiles,
      netWorthSnapshots: state.netWorthSnapshots,
      settings: state.settings,
    };
  },

  importBackup: async (data) => {
    const parsed = backupSchema.parse(data);
    await Promise.all([
      db.transactions.clear(),
      db.assets.clear(),
      db.liabilities.clear(),
      db.categories.clear(),
      db.categoryRules.clear(),
      db.statementProfiles.clear(),
      db.netWorthSnapshots.clear(),
    ]);
    await Promise.all([
      db.transactions.bulkPut(parsed.transactions),
      db.assets.bulkPut(parsed.assets),
      db.liabilities.bulkPut(parsed.liabilities),
      db.categories.bulkPut(parsed.categories),
      db.categoryRules.bulkPut(parsed.categoryRules ?? []),
      db.statementProfiles.bulkPut(parsed.statementProfiles ?? []),
      db.netWorthSnapshots.bulkPut(parsed.netWorthSnapshots),
    ]);
    await updateSettings({
      onboardingComplete: parsed.settings.onboardingComplete ?? false,
      defaultCurrency: parsed.settings.defaultCurrency ?? "AUD",
      aiAssistEnabled: parsed.settings.aiAssistEnabled ?? false,
      geminiApiKey: parsed.settings.geminiApiKey ?? "",
    });
    await initializeDatabase();
    await get().loadAll();
  },

  clearData: async () => {
    await clearAllData();
    await updateSettings({ onboardingComplete: false });
    await get().loadAll();
  },
}));

export { createUserRule };
