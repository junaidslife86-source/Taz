import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { DraftTransaction } from "../types/finance";
import {
  detectStatementFormat,
  parseStatementText,
} from "./statement-formats/westpac";
import type { StatementFormat, StatementProfile } from "../types/finance";
import { findMatchingProfile } from "./statement-profiles";
import type {
  ParseStats,
  ReconciliationResult,
  StatementSummary,
} from "./statement-formats/reconciliation";
import {
  assertFileSize,
  assertPdfPageCount,
  assertTextLength,
} from "./security-limits";

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
  assertFileSize(file);

  let pdf;
  try {
    const buffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch {
    throw new Error(
      "Could not read this PDF. The file may be corrupted, password-protected, or unsupported.",
    );
  }

  assertPdfPageCount(pdf.numPages);

  const allLines: string[] = [];
  let textLength = 0;

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageLines = linesFromTextContent(
        content.items as Array<{ str?: string; transform?: number[] }>,
      );

      if (pageLines.length > 0) {
        for (const line of pageLines) {
          textLength += line.length;
          assertTextLength(textLength);
          allLines.push(line);
        }
      } else {
        const fallback = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        if (fallback.trim()) {
          textLength += fallback.length;
          assertTextLength(textLength);
          allLines.push(fallback.trim());
        }
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === "ImportLimitError") throw e;
    throw new Error("Failed to extract text from this PDF. Try exporting a CSV from your bank.");
  }

  const rawText = allLines.join("\n");
  assertTextLength(rawText.length);
  const detectedFormat = detectStatementFormat(rawText, file.name);
  let parsed = parseStatementText(rawText, file.name);

  const match =
    options?.profiles?.length &&
    findMatchingProfile(file.name, rawText, options.profiles);

  if (match) {
    const profileFormat = match.profile.statementFormat;
    const formatMatchesDetection =
      profileFormat === detectedFormat || detectedFormat === "generic";

    if (formatMatchesDetection) {
      parsed = parseStatementText(rawText, file.name, {
        format: profileFormat,
        accountName: match.profile.accountName,
      });
      return buildPdfResult(file.name, rawText, parsed, {
        matchedProfileId: match.profile.id,
        usedLearnedProfile: true,
      });
    }

    parsed = parseStatementText(rawText, file.name, {
      format: detectedFormat,
      accountName: match.profile.accountName,
    });
    return buildPdfResult(file.name, rawText, parsed, {
      matchedProfileId: match.profile.id,
      usedLearnedProfile: false,
    });
  }

  return buildPdfResult(file.name, rawText, parsed);
}

export { parseStatementText } from "./statement-formats/westpac";
