import { Wallet, signPaymentChannelClaim } from "xrpl";
import { describe, expect, it } from "vitest";
import {
  claimChannel,
  closeChannel,
  createChannel,
  fundChannel,
  signChannelClaim,
  verifyChannelClaim,
} from "./channels";

const CHANNEL_ID = "5F".repeat(32);
const SUPPLIER = "rSupplierAddress";
const TREASURY = "rTreasuryAddress";

function makeWallet() {
  const wallet = Wallet.generate();
  return { privateKey: wallet.privateKey, publicKey: wallet.publicKey };
}

describe("createChannel", () => {
  it("builds a PaymentChannelCreate in drops", () => {
    const { publicKey } = makeWallet();

    expect(createChannel(TREASURY, SUPPLIER, "2500000", publicKey)).toEqual({
      TransactionType: "PaymentChannelCreate",
      Account: TREASURY,
      Destination: SUPPLIER,
      Amount: "2500000",
      SettleDelay: 3600,
      PublicKey: publicKey,
    });
  });

  it("accepts a custom settle delay and rejects bad amounts", () => {
    const { publicKey } = makeWallet();

    expect(createChannel(TREASURY, SUPPLIER, "1", publicKey, 60).SettleDelay).toBe(60);
    expect(() => createChannel(TREASURY, SUPPLIER, "0", publicKey)).toThrow();
    expect(() => createChannel(TREASURY, SUPPLIER, "1.5", publicKey)).toThrow();
  });
});

describe("fundChannel", () => {
  it("builds a top-up with and without an expiration", () => {
    expect(fundChannel(TREASURY, CHANNEL_ID, "1000000")).toEqual({
      TransactionType: "PaymentChannelFund",
      Account: TREASURY,
      Channel: CHANNEL_ID,
      Amount: "1000000",
    });
    expect(fundChannel(TREASURY, CHANNEL_ID, "1000000", 1_800_000_000).Expiration).toBe(
      1_800_000_000 - 946_684_800,
    );
  });
});

describe("signChannelClaim and verifyChannelClaim", () => {
  it("signs the amount in XRP units as xrpl.js 5.x expects", () => {
    const { privateKey, publicKey } = makeWallet();

    expect(signChannelClaim(CHANNEL_ID, "2500000", privateKey)).toBe(
      signPaymentChannelClaim(CHANNEL_ID, "2.5", privateKey),
    );
    expect(
      verifyChannelClaim(
        CHANNEL_ID,
        "2500000",
        signChannelClaim(CHANNEL_ID, "2500000", privateKey),
        publicKey,
      ),
    ).toBe(true);
  });

  it("handles a whole XRP amount without a decimal point", () => {
    const { privateKey, publicKey } = makeWallet();
    const signature = signChannelClaim(CHANNEL_ID, "1000000", privateKey);

    expect(signature).toBe(signPaymentChannelClaim(CHANNEL_ID, "1", privateKey));
    expect(verifyChannelClaim(CHANNEL_ID, "1000000", signature, publicKey)).toBe(true);
  });

  it("rejects a claim for a different channel or a larger cumulative total", () => {
    const { privateKey, publicKey } = makeWallet();
    const signature = signChannelClaim(CHANNEL_ID, "2500000", privateKey);

    expect(verifyChannelClaim("AB".repeat(32), "2500000", signature, publicKey)).toBe(false);
    expect(verifyChannelClaim(CHANNEL_ID, "2500001", signature, publicKey)).toBe(false);
    expect(verifyChannelClaim(CHANNEL_ID, "2500000", signature, makeWallet().publicKey)).toBe(
      false,
    );
  });

  it("rejects malformed claims instead of throwing", () => {
    const { publicKey } = makeWallet();

    expect(verifyChannelClaim(CHANNEL_ID, "0", "00", publicKey)).toBe(false);
    expect(verifyChannelClaim(CHANNEL_ID, "2500000", "00", publicKey)).toBe(false);
    expect(() => signChannelClaim(CHANNEL_ID, "-1", makeWallet().privateKey)).toThrow();
  });
});

describe("claimChannel and closeChannel", () => {
  it("builds the supplier redemption with the cumulative balance and amount", () => {
    const { publicKey } = makeWallet();

    expect(claimChannel(SUPPLIER, CHANNEL_ID, "2500000", "DEADBEEF", publicKey)).toEqual({
      TransactionType: "PaymentChannelClaim",
      Account: SUPPLIER,
      Channel: CHANNEL_ID,
      Balance: "2500000",
      Amount: "2500000",
      Signature: "DEADBEEF",
      PublicKey: publicKey,
    });
  });

  it("builds a close transaction with the tfClose flag", () => {
    expect(closeChannel(TREASURY, CHANNEL_ID)).toEqual({
      TransactionType: "PaymentChannelClaim",
      Account: TREASURY,
      Channel: CHANNEL_ID,
      Flags: 131072,
    });
  });
});
