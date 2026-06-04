import type { CategoryRule } from "../types/finance";

export const defaultCategoryRules: Omit<
  CategoryRule,
  "id" | "createdAt"
>[] = [
  {
    keywords: ["woolworths", "coles", "aldi", "iga", "harris farm"],
    category: "Groceries",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["uber", "didi", "opal", "transport nsw", "myki", "go card"],
    category: "Transport",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["netflix", "spotify", "youtube", "disney+", "stan", "apple.com/bill"],
    category: "Subscriptions",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["qantas", "jetstar", "virgin", "airbnb", "booking.com", "expedia"],
    category: "Travel",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["bupa", "hcf", "medibank", "nib", "ahm"],
    category: "Insurance",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["chemist warehouse", "pharmacy", "priceline pharmacy", "doctor", "medical"],
    category: "Healthcare",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["mcdonald", "kfc", "grill", "cafe", "restaurant", "ubereats", "deliveroo", "menulog"],
    category: "Dining",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["origin energy", "agl", "energy australia", "electricity", "gas bill"],
    category: "Utilities",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["telstra", "optus", "vodafone", "phone bill", "mobile"],
    category: "Utilities",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["amazon", "ebay", "kmart", "target", "big w", "myer", "david jones"],
    category: "Shopping",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["salary", "payroll", "wages", "employer"],
    category: "Salary",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["interest earned", "dividend", "refund"],
    category: "Income",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["transfer", "tfr", "bpay transfer", "internal transfer"],
    category: "Transfer",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["gym", "fitness", "cinema", "event", "ticketmaster"],
    category: "Entertainment",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["rent", "real estate", "property management"],
    category: "Rent",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["mortgage", "home loan", "nab home", "cba home", "westpac home"],
    category: "Mortgage",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["shell", "bp ", "caltex", "ampol", "petrol", "fuel"],
    category: "Transport",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["university", "tafe", "course", "udemy", "coursera"],
    category: "Education",
    isDefault: true,
    source: "default",
  },
  {
    keywords: ["commsec", "nabtrade", "stake", "super", "hostplus", "australian super"],
    category: "Investments",
    isDefault: true,
    source: "default",
  },
];

export function normalizeDescription(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, " ");
}

export function extractKeyword(description: string): string {
  const normalized = normalizeDescription(description);
  const cleaned = normalized
    .replace(/\d{4,}/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  return words.slice(0, 3).join(" ") || normalized.slice(0, 30);
}

export function matchesKeywords(
  description: string,
  keywords: string[],
): boolean {
  const normalized = normalizeDescription(description);
  return keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}
