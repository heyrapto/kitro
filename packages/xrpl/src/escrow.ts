/// <reference path="./types/five-bells-condition.d.ts" />
import { randomBytes } from "node:crypto";
import cc from "five-bells-condition";
import type { EscrowCancel, EscrowCreate, EscrowFinish } from "xrpl";

export const RIPPLE_EPOCH = 946684800;

export type EscrowCondition = {
  condition: string;
  fulfillment: string;
};

/**
 * The preimage is the secret that releases the escrow. Store the fulfillment
 * encrypted; anyone who holds it can finish the escrow to its fixed payee.
 */
export function newCondition(): EscrowCondition {
  const preimage = randomBytes(32);
  const fulfillment = new cc.PreimageSha256();
  fulfillment.setPreimage(preimage);

  return {
    condition: fulfillment.getConditionBinary().toString("hex").toUpperCase(),
    fulfillment: fulfillment.serializeBinary().toString("hex").toUpperCase(),
  };
}

/** XRPL timestamps are seconds since 2000-01-01T00:00:00Z. */
export function toRippleTime(unixSeconds: number): number {
  return unixSeconds - RIPPLE_EPOCH;
}

export function fromRippleTime(rippleSeconds: number): number {
  return rippleSeconds + RIPPLE_EPOCH;
}

export function escrowCreate(
  treasury: string,
  payee: string,
  amountDrops: string,
  condition: string,
  cancelAfterUnix: number,
): EscrowCreate {
  assertDrops(amountDrops);

  return {
    TransactionType: "EscrowCreate",
    Account: treasury,
    Destination: payee,
    Amount: amountDrops,
    Condition: condition,
    CancelAfter: toRippleTime(cancelAfterUnix),
  };
}

export function escrowFinish(
  relayer: string,
  owner: string,
  offerSequence: number,
  condition: string,
  fulfillment: string,
): EscrowFinish {
  return {
    TransactionType: "EscrowFinish",
    Account: relayer,
    Owner: owner,
    OfferSequence: offerSequence,
    Condition: condition,
    Fulfillment: fulfillment,
  };
}

export function escrowCancel(relayer: string, owner: string, offerSequence: number): EscrowCancel {
  return {
    TransactionType: "EscrowCancel",
    Account: relayer,
    Owner: owner,
    OfferSequence: offerSequence,
  };
}

function assertDrops(amountDrops: string): void {
  if (!/^[1-9]\d*$/.test(amountDrops)) {
    throw new Error("Escrow amount must be a positive integer string of drops");
  }
}
