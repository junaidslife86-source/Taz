import { describe, expect, it } from "vitest";
import {
  computeSpendingByCategory,
  filterExpensesForMonth,
  listMonthOptionsFromTransactions,
} from "./spend-reports";
import type { Transaction } from "../types/finance";

const expense = (date: string, amount: number, category: string): Transaction => ({
  id: crypto.randomUUID(),
  date,
  description: "Test",
  amount: -amount,
  type: "expense",
  category,
  importedAt: "2025-01-01T00:00:00.000Z",
});

describe("spend-reports", () => {
  it("lists months from expense transactions", () => {
    const txs = [
      expense("2026-05-15", 55, "Other"),
      expense("2026-06-01", 110, "Other"),
    ];
    const months = listMonthOptionsFromTransactions(txs);
    expect(months).toHaveLength(2);
    expect(months[0]?.key).toBe("2026-05");
    expect(months[1]?.key).toBe("2026-06");
  });

  it("filters and totals by month", () => {
    const txs = [
      expense("2026-05-15", 55, "Groceries"),
      expense("2026-05-20", 45, "Transport"),
      expense("2026-06-01", 110, "Other"),
    ];
    const months = listMonthOptionsFromTransactions(txs);
    const may = months.find((m) => m.key === "2026-05")!;
    const mayExpenses = filterExpensesForMonth(txs, may);
    const { total, slices } = computeSpendingByCategory(mayExpenses);
    expect(total).toBe(100);
    expect(slices).toHaveLength(2);
  });
});
