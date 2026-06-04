import type { Category } from "../types/finance";
import { FALLBACK_CATEGORY } from "../types/finance";

/** Default emoji per category name (seed + backfill) */
export const DEFAULT_CATEGORY_EMOJIS: Record<string, string> = {
  [FALLBACK_CATEGORY]: "📦",
  Income: "💰",
  Salary: "💵",
  Groceries: "🛒",
  Dining: "🍽️",
  Transport: "🚗",
  Rent: "🏠",
  Mortgage: "🏡",
  Utilities: "💡",
  Insurance: "🛡️",
  Healthcare: "🏥",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Travel: "✈️",
  Education: "📚",
  Subscriptions: "📱",
  Investments: "📈",
  Transfer: "↔️",
};

export function defaultEmojiForName(name: string): string {
  return DEFAULT_CATEGORY_EMOJIS[name] ?? "";
}

/** Keep at most one emoji (supports compound emoji sequences) */
export function normalizeEmoji(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return [...trimmed].slice(0, 2).join("");
}

export function formatCategoryLabel(
  category: Pick<Category, "name" | "emoji"> | string,
  catalog?: Category[],
): string {
  const resolved =
    typeof category === "string"
      ? catalog?.find((c) => c.name === category)
      : category;

  const name = typeof category === "string" ? category : category.name;
  const emoji =
    (typeof category === "string"
      ? resolved?.emoji
      : category.emoji) ||
    resolved?.emoji ||
    defaultEmojiForName(name);

  return emoji ? `${emoji} ${name}` : name;
}

export function resolveCategory(
  name: string,
  catalog: Category[],
): Pick<Category, "name" | "emoji"> {
  const found = catalog.find((c) => c.name === name);
  return {
    name,
    emoji: found?.emoji ?? defaultEmojiForName(name),
  };
}
