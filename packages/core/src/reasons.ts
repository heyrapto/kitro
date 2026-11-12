/**
 * Reason codes shared by the policy engine and signed receipts. They live in
 * core so a receipt can be parsed and verified without importing the rules.
 */
export const REASON_CODES = [
  "NO_MANDATE",
  "PAUSED",
  "DUPLICATE_INVOICE",
  "BAD_AMOUNT",
  "OVER_PER_PAYMENT_CAP",
  "OVER_DAILY_CAP",
  "PAYEE_ADDRESS_CHANGED",
  "NEEDS_APPROVAL_AMOUNT",
  "PAYEE_NOT_ALLOWED",
] as const;

export type Reason = (typeof REASON_CODES)[number];
