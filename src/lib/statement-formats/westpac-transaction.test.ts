import { describe, expect, it } from "vitest";
import {
  detectStatementFormat,
  isWestpacCreditCard,
  isWestpacTransactionAccount,
  parseStatementText,
} from "./westpac";

/** Representative Westpac everyday/debit statement text (DD/MM/YY + debit/credit columns). */
const DEBIT_STATEMENT = `
westpac
Opening Balance + $39.82
Total Credits + $2,567.02
Total Debits - $2,550.00
Closing Balance + $56.84
DATE TRANSACTION DESCRIPTION DEBIT CREDIT BALANCE
30/05/25 STATEMENT OPENING BALANCE 39.82
09/06/25 Deposit-Osko Payment 2056604 Mr Muhammad Haroon Abdullah Salik fine 80.00 119.82
13/06/25 Deposit-Osko Payment 2089592 Hei Yau Transfer back tmrw pls 2,000.00 2,119.82
16/06/25 Withdrawal Mobile 1087186 Tfr Westpac Cho 2,000.00 119.82
23/06/25 Deposit McAre Benefits 844141146 210624 41.40 161.22
25/06/25 Deposit Paypal Australia 1043071839137 100.62 261.84
30/06/25 Deposit Online 2002215 Tfr Westpac Cho 200.00 461.84
30/06/25 Deposit Online 2007779 Tfr Westpac Cho 100.00 561.84
30/06/25 Deposit Octopus Group Octgrp Redemption 45.00 606.84
30/06/25 Withdrawal At Handybank Bnkstn Cntro 2 14524162
29/06/25 550.00 56.84
30/06/25 CLOSING BALANCE 56.84
`.trim();

describe("Westpac transaction account statement", () => {
  it("detects transaction account not credit card", () => {
    expect(isWestpacTransactionAccount(DEBIT_STATEMENT, "statement.pdf")).toBe(
      true,
    );
    expect(isWestpacCreditCard(DEBIT_STATEMENT, "statement.pdf")).toBe(false);
    expect(detectStatementFormat(DEBIT_STATEMENT, "statement.pdf")).toBe(
      "westpac_transaction",
    );
  });

  it("parses all movements with correct amounts and years", () => {
    const result = parseStatementText(DEBIT_STATEMENT, "statement.pdf");
    expect(result.format).toBe("westpac_transaction");
    expect(result.transactions).toHaveLength(9);

    const amounts = result.transactions.map((t) => t.amount).sort((a, b) => a - b);
    expect(amounts).toEqual(
      [-2000, -550, 41.4, 45, 80, 100, 100.62, 200, 2000].sort((a, b) => a - b),
    );

    for (const tx of result.transactions) {
      expect(tx.date).toMatch(/^2025-/);
      expect(tx.date).not.toContain("0025");
    }

    const withdrawal = result.transactions.find((t) =>
      t.description.toLowerCase().includes("withdrawal mobile"),
    );
    expect(withdrawal?.amount).toBe(-2000);

    const handybank = result.transactions.find((t) =>
      t.description.toLowerCase().includes("handybank"),
    );
    expect(handybank?.amount).toBe(-550);
    expect(handybank?.description).toMatch(/14524162/);
  });

  it("reconciles credits and debits against statement summary", () => {
    const result = parseStatementText(DEBIT_STATEMENT, "statement.pdf");
    expect(result.summary.totalCredits).toBeCloseTo(2567.02, 2);
    expect(result.summary.totalDebits).toBeCloseTo(2550, 2);
    expect(result.statementReconciliation.isBalanced).toBe(true);
  });
});
