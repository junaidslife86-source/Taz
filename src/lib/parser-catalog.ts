import type { ColumnMapping, StatementFormat } from "../types/finance";
import type { ReconciliationKind } from "./statement-formats/reconciliation";

/** Static parser metadata for community template sharing (no user data). */
export const PARSER_CATALOG = {
  supportedFormats: [
    "westpac_credit_card",
    "westpac_transaction",
    "generic",
  ] as StatementFormat[],
  bankDetectionRules: [
    {
      format: "westpac_credit_card" as const,
      filenameHints: ["cc_", "credit card"],
      textSignatures: [
        "westpac",
        "mastercard",
        "altitude qantas",
        "date of transaction",
      ],
    },
    {
      format: "westpac_transaction" as const,
      filenameHints: ["westpac"],
      textSignatures: ["westpac", "opening balance", "total credits"],
    },
  ],
  columnMappingHints: {
    date: ["date", "transaction date", "posted"],
    description: ["description", "details", "narrative", "merchant"],
    debit: ["debit", "withdrawal", "money out"],
    credit: ["credit", "deposit", "money in"],
    amount: ["amount", "value"],
    balance: ["balance", "running balance"],
    accountName: ["account", "account name"],
  } satisfies Record<keyof ColumnMapping, string[]>,
  dateFormatPatterns: [
    "yyyy-MM-dd (ISO)",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "yyyy/MM/dd",
    "yyyy-MM-dd",
    "Excel serial (30000–60000)",
  ],
  reconciliation: {
    credit_card: {
      formula: "Opening − credits + debits = closing",
      summaryFieldHints: [
        "opening balance",
        "closing balance",
        "payments and other credits",
        "purchases",
        "cash advances",
        "fees and interest",
      ],
    },
    transaction_account: {
      formula: "Opening + credits − debits = closing",
      summaryFieldHints: [
        "opening balance",
        "closing balance",
        "total credits",
        "total debits",
      ],
    },
  } satisfies Record<
    ReconciliationKind,
    { formula: string; summaryFieldHints: string[] }
  >,
  parsingEdgeCases: [
    "Westpac credit card: multi-line transactions merged by date + amount reducer",
    "Westpac credit card: foreign currency fee lines attached to parent purchase",
    "Westpac credit card: payment/credit lines use signed amount from description",
    "Westpac transaction: lines starting with dd/mm/yy date prefix",
    "Credit card reconciliation: opening balance used as total credits when credits line missing",
    "CSV/XLSX: separate debit and credit columns vs single signed amount column",
    "Amounts in parentheses treated as negative",
    "Reconciliation tolerance: balanced if |difference| < 0.02",
  ],
};
