import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { DraftTransaction } from "../types/finance";
import { parseStatementText } from "./statement-formats/westpac";
import type { StatementFormat, StatementProfile } from "../types/finance";
import { findMatchingProfile } from "./statement-profiles";
import type {
  ParseStats,
  ReconciliationResult,
  StatementSummary,
} from "./statement-formats/reconciliation";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type PdfParseResult = {
  fileName: string;
  rawText: string;
  transactions: DraftTransaction[];
  skippedLines: number;
  detectedFormat?: StatementFormat;
  accountName?: string;
  stats: ParseStats;
  summary: StatementSummary;
  reconciliation: ReconciliationResult;
  statementReconciliation: ReconciliationResult;
  matchedProfileId?: string;
  usedLearnedProfile?: boolean;
};

export type ParsePdfOptions = {
  profiles?: StatementProfile[];
};

type TextItem = {
  str: string;
  transform: number[];
};

function linesFromTextContent(
  items: Array<{ str?: string; transform?: number[] }>,
): string[] {
  const textItems = items.filter(
    (item): item is TextItem =>
      Boolean(item.str?.trim()) && Array.isArray(item.transform),
  );

  if (textItems.length === 0) return [];

  const rowMap = new Map<number, TextItem[]>();

  for (const item of textItems) {
    const y = Math.round(item.transform[5]);
    const bucket = rowMap.get(y) ?? [];
    bucket.push(item);
    rowMap.set(y, bucket);
  }

  const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);

  return sortedYs.map((y) => {
    const row = rowMap.get(y)!;
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    return row.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
  });
}

function buildPdfResult(
  fileName: string,
  rawText: string,
  parsed: ReturnType<typeof parseStatementText>,
  extra?: { matchedProfileId?: string; usedLearnedProfile?: boolean },
): PdfParseResult {
  const lineCount = rawText.split(/\r?\n/).filter(Boolean).length;
  const skippedLines = Math.max(
    0,
    lineCount - parsed.stats.detectedTransactionCount,
  );

  return {
    fileName,
    rawText,
    transactions: parsed.transactions,
    skippedLines,
    detectedFormat: parsed.format,
    accountName: parsed.accountName || undefined,
    stats: parsed.stats,
    summary: parsed.summary,
    reconciliation: parsed.reconciliation,
    statementReconciliation: parsed.statementReconciliation,
    ...extra,
  };
}

export async function parsePdf(
  file: File,
  options?: ParsePdfOptions,
): Promise<PdfParseResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageLines = linesFromTextContent(
      content.items as Array<{ str?: string; transform?: number[] }>,
    );

    if (pageLines.length > 0) {
      allLines.push(...pageLines);
    } else {
      const fallback = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      if (fallback.trim()) allLines.push(fallback.trim());
    }
  }

  const rawText = allLines.join("\n");
  const initial = parseStatementText(rawText, file.name);

  const match =
    options?.profiles?.length &&
    findMatchingProfile(file.name, rawText, options.profiles);

  if (match) {
    const learned = parseStatementText(rawText, file.name, {
      format: match.profile.statementFormat,
      accountName: match.profile.accountName,
    });
    return buildPdfResult(file.name, rawText, learned, {
      matchedProfileId: match.profile.id,
      usedLearnedProfile: true,
    });
  }

  return buildPdfResult(file.name, rawText, initial);
}

export { parseStatementText } from "./statement-formats/westpac";
