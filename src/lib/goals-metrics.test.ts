import { describe, expect, it } from "vitest";
import { computeGoalProgress } from "./goals-metrics";
import type { Goal, GoalEntry } from "../types/finance";

const baseGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "g1",
  name: "Holiday",
  kind: "savings",
  targetAmount: 10_000,
  baselineAmount: 1_000,
  monthlyPlan: 500,
  linkedAssetIds: [],
  linkedLiabilityIds: [],
  linkedTransactionIds: [],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("computeGoalProgress", () => {
  it("combines baseline, manual entries, and linked assets", () => {
    const goal = baseGoal({
      linkedAssetIds: ["a1"],
      baselineAmount: 500,
    });
    const entries: GoalEntry[] = [
      {
        id: "e1",
        goalId: "g1",
        date: "2025-02-01",
        amount: 200,
        kind: "contribution",
        createdAt: "2025-02-01T00:00:00.000Z",
      },
    ];
    const progress = computeGoalProgress(
      goal,
      entries,
      [{ id: "a1", name: "Saver", assetType: "cash", value: 3000, currency: "AUD", updatedAt: "" }],
      [],
      [],
      new Date("2025-06-15"),
    );
    expect(progress.savedSoFar).toBe(3200);
    expect(progress.percent).toBe(32);
  });

  it("marks complete when target reached", () => {
    const progress = computeGoalProgress(
      baseGoal({ baselineAmount: 10_000 }),
      [],
      [],
      [],
      [],
    );
    expect(progress.status).toBe("complete");
    expect(progress.statusLabel).toBe("Goal reached");
  });
});
