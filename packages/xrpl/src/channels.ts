import {
  PaymentChannelClaimFlags,
  signPaymentChannelClaim,
  verifyPaymentChannelClaim,
  type PaymentChannelClaim,
  type PaymentChannelCreate,
  type PaymentChannelFund,
} from "xrpl";
import { toRippleTime } from "./escrow";

/**
 * xrpl.js 5.x takes the claim amount in XRP, not drops. Our whole codebase
 * tracks drops, so convert exactly (no floating point) before signing.
 */
function dropsToXrpString(drops: string): string {
  const padded = drops.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

function assertDrops(amountDrops: string): void {
  if (!/^[1-9]\d*$/.test(amountDrops)) {
    throw new Error("Channel amount must be a positive integer string of drops");
  }
}

/** Owner funds the channel; the policy service's claim key signs redemptions. */
export function createChannel(
  treasury: string,
  supplier: string,
  amountDrops: string,
  claimPublicKey: string,
  settleDelaySeconds = 3600,
): PaymentChannelCreate {
  assertDrops(amountDrops);

  return {
    TransactionType: "PaymentChannelCreate",
    Account: treasury,
    Destination: supplier,
    Amount: amountDrops,
    SettleDelay: settleDelaySeconds,
    PublicKey: claimPublicKey,
  };
}

/** Top up an existing channel. Expiration is a Unix timestamp, if supplied. */
export function fundChannel(
  account: string,
  channelId: string,
  amountDrops: string,
  expirationUnix?: number,
): PaymentChannelFund {
  assertDrops(amountDrops);

  return {
    TransactionType: "PaymentChannelFund",
    Account: account,
    Channel: channelId,
    Amount: amountDrops,
    ...(expirationUnix === undefined ? {} : { Expiration: toRippleTime(expirationUnix) }),
  };
}

/** Sign the cumulative total delivered so far. Claims must never decrease. */
export function signChannelClaim(
  channelId: string,
  cumulativeDrops: string,
  claimPrivateKey: string,
): string {
  assertDrops(cumulativeDrops);
  return signPaymentChannelClaim(channelId, dropsToXrpString(cumulativeDrops), claimPrivateKey);
}

export function verifyChannelClaim(
  channelId: string,
  cumulativeDrops: string,
  signature: string,
  claimPublicKey: string,
): boolean {
  if (!/^[1-9]\d*$/.test(cumulativeDrops)) return false;

  try {
    return verifyPaymentChannelClaim(
      channelId,
      dropsToXrpString(cumulativeDrops),
      signature,
      claimPublicKey,
    );
  } catch {
    return false;
  }
}

/** The supplier submits this to redeem the cumulative claim on-ledger. */
export function claimChannel(
  supplier: string,
  channelId: string,
  cumulativeDrops: string,
  signature: string,
  claimPublicKey: string,
): PaymentChannelClaim {
  assertDrops(cumulativeDrops);

  return {
    TransactionType: "PaymentChannelClaim",
    Account: supplier,
    Channel: channelId,
    Balance: cumulativeDrops,
    Amount: cumulativeDrops,
    Signature: signature,
    PublicKey: claimPublicKey,
  };
}

/** The owner closes the channel; remaining funds return after SettleDelay. */
export function closeChannel(owner: string, channelId: string): PaymentChannelClaim {
  return {
    TransactionType: "PaymentChannelClaim",
    Account: owner,
    Channel: channelId,
    Flags: PaymentChannelClaimFlags.tfClose,
  };
}
