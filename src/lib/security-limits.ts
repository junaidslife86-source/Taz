/** Import and parse limits — mitigates in-browser DoS from oversized files */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_PAGES = 50;
export const MAX_ROWS = 20_000;
export const MAX_TEXT_LENGTH = 2_000_000;
export const MAX_BACKUP_JSON_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_BACKUP_TRANSACTIONS = 50_000;
export const MAX_BACKUP_ENTITIES = 10_000;

export class ImportLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportLimitError";
  }
}

export function assertFileSize(file: File, maxBytes = MAX_FILE_SIZE_BYTES): void {
  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    throw new ImportLimitError(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is ${mb} MB.`,
    );
  }
  if (file.size === 0) {
    throw new ImportLimitError("File is empty.");
  }
}

export function assertTextLength(
  length: number,
  max = MAX_TEXT_LENGTH,
): void {
  if (length > max) {
    throw new ImportLimitError(
      `Extracted text exceeds the ${(max / 1_000_000).toFixed(0)}M character limit.`,
    );
  }
}

export function assertRowCount(count: number, max = MAX_ROWS): void {
  if (count > max) {
    throw new ImportLimitError(
      `Too many rows (${count.toLocaleString()}). Maximum is ${max.toLocaleString()}.`,
    );
  }
}

export function assertPdfPageCount(numPages: number, max = MAX_PDF_PAGES): void {
  if (numPages > max) {
    throw new ImportLimitError(
      `PDF has ${numPages} pages. Maximum supported is ${max} pages.`,
    );
  }
}

export function assertBackupJsonSize(
  byteLength: number,
  max = MAX_BACKUP_JSON_BYTES,
): void {
  if (byteLength > max) {
    throw new ImportLimitError(
      `Backup file is too large. Maximum is ${(max / (1024 * 1024)).toFixed(0)} MB.`,
    );
  }
}

/** Redact sensitive patterns before sending text to optional AI Assist */
export function redactForAiAssist(text: string, maxLen = 200): string {
  let redacted = text
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD]")
    .replace(/\b\d{10,}\b/g, "[NUM]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .trim();
  if (redacted.length > maxLen) {
    redacted = `${redacted.slice(0, maxLen)}…`;
  }
  return redacted;
}
