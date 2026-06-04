import { describe, expect, it } from "vitest";
import { spendingByCategory, sumExpensesInPeriod } from "./calculations";
import type { Transaction } from "../types/finance";

const expense = (
  date: string,
  amount: number,
  category: string,
): Transaction => ({
  id: crypto.randomUUID(),
  date,
  description: "Test",
  amount: -amount,
  type: "expense",
  category,
  importedAt: "2025-01-01T00:00:00.000Z",
});

describe("spendingByCategory", () => {
  const ref = new Date("2026-06-04T12:00:00.000Z");

  it("includes expenses from the prior month within last 30 days", () => {
    const transactions = [
      expense("2026-06-01", 110, "Other"),
      expense("2026-05-15", 55, "Other"),
      expense("2026-05-15", 87, "Other"),
    ];

    const monthOnly = spendingByCategory(transactions, {
      period: "month",
      referenceDate: ref,
    });
    expect(monthOnly).toEqual([{ category: "Other", amount: 110 }]);

    const last30 = spendingByCategory(transactions, {
      period: "last30days",
      referenceDate: ref,
    });
    expect(last30).toEqual([{ category: "Other", amount: 252 }]);
    expect(
      sumExpensesInPeriod(transactions, "last30days", ref),
    ).toBe(252);
    expect(sumExpensesInPeriod(transactions, "month", ref)).toBe(110);
  });

  it("aggregates multiple categories", () => {
    const transactions = [
      expense("2026-06-01", 50, "Groceries"),
      expense("2026-06-02", 30, "Transport"),
      expense("2026-06-03", 20, "Groceries"),
    ];

    const result = spendingByCategory(transactions, {
      period: "last30days",
      referenceDate: ref,
    });
    expect(result).toEqual([
      { category: "Groceries", amount: 70 },
      { category: "Transport", amount: 30 },
    ]);
  });
});
