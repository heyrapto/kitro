import type { Mandate } from "@kitro/core";

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

export type Decision =
  | { outcome: "refuse"; reasons: Reason[] }
  | { outcome: "hold"; reasons: Reason[] }
  | { outcome: "allow"; route: "channel" | "payment" | "escrow" };

export type State = {
  spentTodayDrops: bigint;
  invoiceSeen: boolean;
  addressChanged: boolean;
};

export type Request = {
  payee: string;
  amountDrops: string;
};

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/**
 * Pure policy check. No network, database or XRPL imports, so every rule is
 * cheap to test and the decision logic stays independent of the agent.
 */
export function evaluate(mandate: Mandate | null, request: Request, state: State): Decision {
  if (!mandate) return { outcome: "refuse", reasons: ["NO_MANDATE"] };
  if (mandate.paused) return { outcome: "refuse", reasons: ["PAUSED"] };
  if (state.invoiceSeen) return { outcome: "refuse", reasons: ["DUPLICATE_INVOICE"] };
  if (!POSITIVE_INTEGER.test(request.amountDrops)) {
    return { outcome: "refuse", reasons: ["BAD_AMOUNT"] };
  }

  const amount = BigInt(request.amountDrops);

  // Collect cap failures together so the operator sees everything wrong at once.
  const refuse: Reason[] = [];
  if (amount > BigInt(mandate.perPaymentMaxDrops)) refuse.push("OVER_PER_PAYMENT_CAP");
  if (state.spentTodayDrops + amount > BigInt(mandate.dailyMaxDrops)) {
    refuse.push("OVER_DAILY_CAP");
  }
  if (refuse.length > 0) return { outcome: "refuse", reasons: refuse };

  const hold: Reason[] = [];
  if (state.addressChanged) hold.push("PAYEE_ADDRESS_CHANGED");
  if (amount > BigInt(mandate.requireApprovalAboveDrops)) hold.push("NEEDS_APPROVAL_AMOUNT");
  if (hold.length > 0) return { outcome: "hold", reasons: hold };

  const payee = mandate.payees.find((entry) => entry.address === request.payee);
  if (payee) return { outcome: "allow", route: payee.route };

  return mandate.newPayeeRoute === "escrow"
    ? { outcome: "allow", route: "escrow" }
    : { outcome: "refuse", reasons: ["PAYEE_NOT_ALLOWED"] };
}
