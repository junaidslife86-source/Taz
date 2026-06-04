import type {
  FinancialAccountType,
  StatementFormat,
  StatementProfile,
} from "../types/finance";
import { hasWestpacTransactionTableMarkers } from "./statement-formats/westpac";

const MATCH_THRESHOLD = 40;

export function accountTypeFromFormat(
  format: StatementFormat,
): FinancialAccountType {
  switch (format) {
    case "westpac_credit_card":
      return "credit_card";
    case "westpac_transaction":
      return "transaction_account";
    default:
      return "unknown";
  }
}

export function formatLabel(format: StatementFormat): string {
  switch (format) {
    case "westpac_credit_card":
      return "Westpac credit card";
    case "westpac_transaction":
      return "Westpac everyday account";
    default:
      return "Generic statement";
  }
}

export function accountTypeLabel(type: FinancialAccountType): string {
  switch (type) {
    case "credit_card":
      return "Credit card";
    case "transaction_account":
      return "Everyday / transaction account";
    case "savings":
      return "Savings account";
    default:
      return "Other / unknown";
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function scoreProfile(
  profile: StatementProfile,
  filename: string,
  statementText: string,
): number {
  let score = 0;
  const fn = filename.toLowerCase();
  const head = statementText.slice(0, 12_000).toLowerCase();

  if (
    profile.statementFormat === "westpac_credit_card" &&
    hasWestpacTransactionTableMarkers(statementText)
  ) {
    return 0;
  }

  if (
    profile.statementFormat === "westpac_transaction" &&
    head.includes("date of transaction") &&
    head.includes("mastercard") &&
    !hasWestpacTransactionTableMarkers(statementText)
  ) {
    return 0;
  }

  for (const pattern of profile.fileNamePatterns) {
    const p = pattern.toLowerCase().trim();
    if (p && fn.includes(p)) score += 35;
  }

  for (const sig of profile.textSignatures) {
    const s = sig.toLowerCase().trim();
    if (s.length >= 4 && head.includes(s)) score += 15;
  }

  const acct = profile.accountName.trim().toLowerCase();
  if (acct.length >= 3 && head.includes(acct)) score += 20;

  return score;
}

export function findMatchingProfile(
  filename: string,
  statementText: string,
  profiles: StatementProfile[],
): { profile: StatementProfile; score: number } | null {
  let best: { profile: StatementProfile; score: number } | null = null;

  for (const profile of profiles) {
    const score = scoreProfile(profile, filename, statementText);
    if (score < MATCH_THRESHOLD) continue;
    if (!best || score > best.score) {
      best = { profile, score };
    }
  }

  return best;
}

/** Pull stable phrases from statement header for future matching */
export function extractTextSignatures(text: string): string[] {
  const head = text.slice(0, 4000).toLowerCase();
  const signatures = new Set<string>();

  const phrases = [
    "westpac",
    "mastercard",
    "visa",
    "altitude qantas",
    "altitude",
    "date of transaction",
    "westpac choice",
    "opening balance",
    "closing balance",
    "credit card",
    "everyday account",
    "transaction account",
  ];

  for (const phrase of phrases) {
    if (head.includes(phrase)) signatures.add(phrase);
  }

  const productMatch = text.match(
    /(?:westpac|commonwealth|anz|nab)\s+[\w\s]{2,40}(?:card|account|choice)/i,
  );
  if (productMatch) {
    signatures.add(normalize(productMatch[0]).slice(0, 48));
  }

  return [...signatures].slice(0, 12);
}

export function extractFileNamePatterns(filename: string): string[] {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const lower = base.toLowerCase();
  const patterns = new Set<string>();

  const prefixMatch = lower.match(/^([a-z]{2,6})_/);
  if (prefixMatch) patterns.add(`${prefixMatch[1]}_`);

  if (lower.includes("credit")) patterns.add("credit");
  if (lower.includes("westpac")) patterns.add("westpac");
  if (lower.includes("joint")) patterns.add("joint");

  const stem = lower.replace(/\.[^.]+$/, "");
  if (stem.length >= 4 && stem.length <= 32) {
    const token = stem.split(/[-_\s]/)[0];
    if (token && token.length >= 3) patterns.add(token);
  }

  return [...patterns].slice(0, 6);
}

export function buildProfileLabel(
  accountName: string,
  format: StatementFormat,
): string {
  const name = accountName.trim();
  if (name) return name;
  return formatLabel(format);
}

export function createStatementProfile(input: {
  accountName: string;
  statementFormat: StatementFormat;
  accountType: FinancialAccountType;
  filename: string;
  statementText: string;
  existing?: StatementProfile;
}): StatementProfile {
  const now = new Date().toISOString();
  const fileNamePatterns = [
    ...new Set([
      ...(input.existing?.fileNamePatterns ?? []),
      ...extractFileNamePatterns(input.filename),
    ]),
  ];
  const textSignatures = [
    ...new Set([
      ...(input.existing?.textSignatures ?? []),
      ...extractTextSignatures(input.statementText),
    ]),
  ];

  const accountName = input.accountName.trim() || input.existing?.accountName || "";
  const statementFormat = input.statementFormat;

  return {
    id: input.existing?.id ?? crypto.randomUUID(),
    label: buildProfileLabel(accountName, statementFormat),
    accountName,
    statementFormat,
    accountType: input.accountType,
    fileNamePatterns,
    textSignatures,
    importCount: (input.existing?.importCount ?? 0) + 1,
    lastUsedAt: now,
    createdAt: input.existing?.createdAt ?? now,
  };
}

// fix typo in createStatementProfile - I used input.stateFormat by mistake