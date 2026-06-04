import { describe, expect, it } from "vitest";
import {
  assertBackupJsonSize,
  assertFileSize,
  assertRowCount,
  ImportLimitError,
  MAX_FILE_SIZE_BYTES,
  redactForAiAssist,
} from "./security-limits";

describe("security-limits", () => {
  it("rejects oversized files", () => {
    const file = new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], "big.csv");
    expect(() => assertFileSize(file)).toThrow(ImportLimitError);
  });

  it("rejects too many rows", () => {
    expect(() => assertRowCount(25_000)).toThrow(ImportLimitError);
  });

  it("rejects oversized backup JSON", () => {
    expect(() => assertBackupJsonSize(30 * 1024 * 1024)).toThrow(ImportLimitError);
  });

  it("redacts card-like numbers for AI", () => {
    const out = redactForAiAssist("Payment 4111 1111 1111 1111 at WOOLWORTHS");
    expect(out).not.toContain("4111");
    expect(out).toContain("[CARD]");
  });
});
