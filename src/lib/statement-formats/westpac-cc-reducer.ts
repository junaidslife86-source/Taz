import type { DraftTransaction } from "../../types/finance";
import { normalizeDate, parseStatementAmount, shouldSkipLine } from "./common";

/** Westpac CC text date: `16 Dec 25` */
export const WESTPAC_CC_DATE_RE =
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2})\b/i;

/** Amount with optional trailing credit marker: `1,234.56` or `500.00-` */
export const WESTPAC_CC_AMOUNT_RE = /\b(\d{1,3}(?:,\d{3})*\.\d{2})-?\b/g;

const WESTPAC_DATE_ONLY_RE =
  /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2}$/i;

const FOREIGN_FEE_LINE_RE =
  /^\d+\.\d{2}\s+AUD\+FOREIGN FEE|AUD\+FOREIGN FEE|FOREIGN FEE AUD/i;

const FOREIGN_CURRENCY_CONTINUATION_RE =
  /^(?:USD|EUR|GBP|NZD|SGD|JPY|CAD|CHF|HKD)\s+[\d,.]+|^\d+\.\d{2}\s+[A-Z]{3}/i;

const HEADER_MARKERS = [
  "date of transaction",
  "transaction date",
  "date",
  "description",
  "debit",
  "credit",
  "debits",
  "credits",
];

export type WestpacColumnLayout = {
  datePos: number;
  descPos: number;
  debitPos: number;
  creditPos: number;
} | null;

export type ParsedWestpacLine = {
  date: string;
  description: string;
  debit?: number;
  credit?: number;
  amount: number;
  rawLines: string[];
  needsReview: boolean;
};

export type WestpacCcParseResult = {
  transactions: DraftTransaction[];
  parsedLines: ParsedWestpacLine[];
  rawParsedLineCount: number;
  needsReviewCount: number;
};

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase();
  const hits = HEADER_MARKERS.filter((m) => lower.includes(m)).length;
  return hits >= 3;
}

/** Detect column order from a header row (handles Date|Description vs Description|Date). */
export function detectColumnLayout(line: string): WestpacColumnLayout {
  const parts = line
    .split(/\s{2,}|\t|\|/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length < 2) {
    const tokens = line.toLowerCase().split(/\s+/);
    const datePos = tokens.findIndex((t) => t === "date" || t.includes("date"));
    const descPos = tokens.findIndex((t) => t.includes("description") || t === "details");
    const debitPos = tokens.findIndex((t) => t.includes("debit"));
    const creditPos = tokens.findIndex((t) =>
      t.includes("credit"),
    );
    if (datePos < 0 && descPos < 0) return null;
    return {
      datePos: datePos >= 0 ? datePos : 0,
      descPos: descPos >= 0 ? descPos : 1,
      debitPos: debitPos >= 0 ? debitPos : 2,
      creditPos: creditPos >= 0 ? creditPos : 3,
    };
  }

  const findPos = (...keys: string[]) => {
    const idx = parts.findIndex((p) => keys.some((k) => p.includes(k)));
    return idx >= 0 ? idx : -1;
  };

  const datePos = findPos("date");
  const descPos = findPos("description", "details", "particulars");
  const debitPos = findPos("debit", "withdrawal");
  const creditPos = findPos("credit", "deposit");

  if (datePos < 0 && descPos < 0) return null;

  return {
    datePos: datePos >= 0 ? datePos : 0,
    descPos: descPos >= 0 ? descPos : 1,
    debitPos: debitPos >= 0 ? debitPos : 2,
    creditPos: creditPos >= 0 ? creditPos : 3,
  };
}

function parseAmountToken(raw: string): { value: number; isCredit: boolean } | null {
  const trimmed = raw.trim();
  const isCredit = trimmed.endsWith("-");
  const value = parseStatementAmount(trimmed.replace(/-$/, ""));
  if (value === null) return null;
  return { value: Math.abs(value), isCredit };
}

function extractAmountsFromLine(line: string): { raw: string; isCredit: boolean }[] {
  const results: { raw: string; isCredit: boolean }[] = [];
  WESTPAC_CC_AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WESTPAC_CC_AMOUNT_RE.exec(line)) !== null) {
    const raw = m[1] + (line[m.index + m[0].length - 1] === "-" ? "-" : "");
    const isCredit =
      raw.endsWith("-") || line.slice(m.index + m[0].length).trim().startsWith("-");
    results.push({ raw: m[0], isCredit });
  }
  return results;
}

function isContinuationLine(line: string, hasDate: boolean, hasAmount: boolean): boolean {
  if (hasDate && hasAmount) return false;
  if (FOREIGN_FEE_LINE_RE.test(line)) return true;
  if (FOREIGN_CURRENCY_CONTINUATION_RE.test(line)) return true;
  if (!hasDate && !hasAmount && line.length > 3) return true;
  return false;
}

function toDraftTransaction(row: ParsedWestpacLine): DraftTransaction {
  return {
    id: crypto.randomUUID(),
    date: row.date,
    description: row.description.slice(0, 120),
    amount: row.amount,
  };
}

/**
 * Stateful reducer for messy Westpac credit-card statement text.
 * Handles date caching, multi-line merges, foreign fee lines, and credit markers.
 */
export function parseWestpacCreditCardReducer(
  lines: string[],
): WestpacCcParseResult {
  const transactions: ParsedWestpacLine[] = [];
  let activeDate: string | null = null;
  let rawParsedLineCount = 0;
  let needsReviewCount = 0;

  const countRawCandidate = (line: string) => {
    WESTPAC_CC_AMOUNT_RE.lastIndex = 0;
    if (WESTPAC_CC_AMOUNT_RE.test(line)) rawParsedLineCount++;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || line.length < 4) continue;

    if (isHeaderLine(line)) {
      detectColumnLayout(line);
      continue;
    }

    if (shouldSkipLine(line)) continue;

    countRawCandidate(line);

    if (FOREIGN_FEE_LINE_RE.test(line)) {
      const prev = transactions[transactions.length - 1];
      if (prev) {
        prev.rawLines.push(line);
        continue;
      }
      continue;
    }

    const dateMatch = line.match(WESTPAC_CC_DATE_RE);
    if (dateMatch && WESTPAC_DATE_ONLY_RE.test(dateMatch[1].trim())) {
      const normalized = normalizeDate(dateMatch[1]);
      if (normalized) activeDate = normalized;
    }

    const amountTokens = extractAmountsFromLine(line);
    const hasAmount = amountTokens.length > 0;
    const hasInlineDate = Boolean(dateMatch);

    if (hasAmount && activeDate) {
      const lastToken = amountTokens[amountTokens.length - 1];
      const lineEndsCredit =
        line.trimEnd().endsWith("-") || lastToken.isCredit;

      let debit: number | undefined;
      let credit: number | undefined;
      let amount = 0;

      if (amountTokens.length >= 2 && !lineEndsCredit) {
        const debitToken = amountTokens[amountTokens.length - 2];
        const creditToken = amountTokens[amountTokens.length - 1];
        if (creditToken.isCredit) {
          const c = parseAmountToken(creditToken.raw);
          if (c) {
            credit = c.value;
            amount = c.value;
          }
        } else {
          const d = parseAmountToken(debitToken.raw);
          if (d) {
            debit = d.value;
            amount = -d.value;
          }
        }
      } else {
        const parsed = parseAmountToken(lastToken.raw);
        if (parsed) {
          if (lineEndsCredit || parsed.isCredit) {
            credit = parsed.value;
            amount = parsed.value;
          } else {
            debit = parsed.value;
            amount = -parsed.value;
          }
        }
      }

      if (amount === 0) continue;

      let description = line;
      if (dateMatch) {
        description = description.replace(WESTPAC_CC_DATE_RE, "");
      }
      for (const t of amountTokens) {
        description = description.replace(t.raw, "");
      }
      description = description.replace(/\s*-\s*$/, "").trim();

      const needsReview =
        !description ||
        description.length < 2 ||
        (hasInlineDate && !WESTPAC_DATE_ONLY_RE.test(dateMatch![1].trim()));

      if (needsReview) needsReviewCount++;

      transactions.push({
        date: activeDate,
        description: description || "Transaction",
        debit,
        credit,
        amount,
        rawLines: [line],
        needsReview,
      });
      continue;
    }

    if (isContinuationLine(line, Boolean(dateMatch), hasAmount)) {
      const prev = transactions[transactions.length - 1];
      if (prev) {
        if (!FOREIGN_FEE_LINE_RE.test(line)) {
          prev.description += ` ${line.trim()}`;
        }
        prev.rawLines.push(line);
      }
      continue;
    }

    if (!hasAmount && dateMatch && activeDate) {
      const prev = transactions[transactions.length - 1];
      if (prev && prev.date === activeDate) {
        prev.description += ` ${line.replace(WESTPAC_CC_DATE_RE, "").trim()}`;
        prev.rawLines.push(line);
      }
    }
  }

  const seen = new Set<string>();
  const drafts: DraftTransaction[] = [];

  for (const row of transactions) {
    const key = `${row.date}|${row.description.slice(0, 60)}|${row.amount.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push(toDraftTransaction(row));
  }

  return {
    transactions: drafts,
    parsedLines: transactions,
    rawParsedLineCount,
    needsReviewCount,
  };
}
