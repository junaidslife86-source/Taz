import type { ParseResult } from "./parsers";

export async function parseCsv(file: File): Promise<ParseResult> {
  const Papa = (await import("papaparse")).default;
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = results.data.map((row) => ({ ...row }));
        resolve({ headers, rows, fileName: file.name });
      },
      error: (error) => reject(error),
    });
  });
}
