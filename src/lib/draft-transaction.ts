import type { DraftTransaction } from "../types/finance";

export function createEmptyDraft(): DraftTransaction {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: 0,
  };
}
