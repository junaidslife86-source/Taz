/** Tint colors for category pills, icons, and progress bars */
export type CategoryTheme = {
  color: string;
  bg: string;
  border: string;
};

const THEMES: Record<string, CategoryTheme> = {
  Dining: { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  Groceries: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  Insurance: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  Travel: { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  Utilities: { color: "#ca8a04", bg: "#fefce8", border: "#fef08a" },
  Transport: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  Entertainment: { color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8" },
  Healthcare: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  Health: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  Shopping: { color: "#c026d3", bg: "#fdf4ff", border: "#f5d0fe" },
  Rent: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  Mortgage: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  Subscriptions: { color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff" },
  Income: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  Salary: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  Other: { color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

const FALLBACK: CategoryTheme = THEMES.Other!;

export function categoryTheme(name: string): CategoryTheme {
  return THEMES[name] ?? FALLBACK;
}
