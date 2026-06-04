import type { Transaction } from "../types/finance";

export const TRANSACTION_SEARCH_PARAM = "q";

export function matchesTransactionSearch(
  transaction: Transaction,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const description = transaction.description.toLowerCase();
  const category = transaction.category.toLowerCase();
  const account = (transaction.accountName ?? "").toLowerCase();
  const amount = String(Math.abs(transaction.amount));

  return (
    description.includes(needle) ||
    category.includes(needle) ||
    account.includes(needle) ||
    amount.includes(needle)
  );
}
