import type { ParsedRow, ParseResult } from "./parsers";

export async function parseXlsx(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in spreadsheet.");
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  const headers =
    json.length > 0
      ? Object.keys(json[0])
      : (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? []);
  const rows = json.map((row) => {
    const parsed: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      parsed[key] = value === null || value === undefined ? "" : String(value);
    }
    return parsed;
  });
  return { headers, rows, fileName: file.name };
}
