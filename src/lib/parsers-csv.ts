import type { ParseResult } from "./parsers";
import { assertRowCount } from "./security-limits";

export async function parseCsv(file: File): Promise<ParseResult> {
  const Papa = (await import("papaparse")).default;
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields ?? [];
          assertRowCount(results.data.length);
          const rows = results.data.map((row) => ({ ...row }));
          resolve({ headers, rows, fileName: file.name });
        } catch (e) {
          reject(e);
        }
      },
      error: () =>
        reject(new Error("Could not parse this CSV. Check encoding and column headers.")),
    });
  });
}
