import { deriveKeypair, generateSeed } from "ripple-keypairs";
import { describe, expect, it } from "vitest";
import {
  Receipt,
  ReceiptEnvelope,
  receiptHash,
  signReceipt,
  verifyReceipt,
  type Receipt as ReceiptType,
} from "./receipt";

function makeKeypair() {
  const seed = generateSeed();
  const { privateKey, publicKey } = deriveKeypair(seed);
  return { privateKey, publicKey };
}

function makeReceipt(overrides: Partial<ReceiptType> = {}): ReceiptType {
  return {
    requestId: "req_01",
    invoiceId: "INV-1042",
    payee: "rSupplierAddress",
    amountDrops: "2500000",
    outcome: "allow",
    reasons: [],
    route: "payment",
    mandateVersion: 3,
    issuedAt: "2026-11-12T10:05:00Z",
    ...overrides,
  };
}

describe("receiptHash", () => {
  it("hashes the same values to the same digest regardless of key order", () => {
    const receipt = makeReceipt();
    const reordered: ReceiptType = {
      issuedAt: receipt.issuedAt,
      mandateVersion: receipt.mandateVersion,
      route: receipt.route,
      reasons: receipt.reasons,
      outcome: receipt.outcome,
      amountDrops: receipt.amountDrops,
      payee: receipt.payee,
      invoiceId: receipt.invoiceId,
      requestId: receipt.requestId,
    };

    expect(receiptHash(reordered)).toBe(receiptHash(receipt));
    expect(receiptHash(receipt)).toMatch(/^[0-9A-F]{64}$/);
  });

  it("changes when the outcome, amount or transaction changes", () => {
    const receipt = makeReceipt();

    expect(receiptHash({ ...receipt, outcome: "refuse", route: undefined })).not.toBe(
      receiptHash(receipt),
    );
    expect(receiptHash({ ...receipt, amountDrops: "2500001" })).not.toBe(receiptHash(receipt));
    expect(receiptHash({ ...receipt, txHash: "AB".repeat(32) })).not.toBe(receiptHash(receipt));
  });

  it("ignores fields outside the receipt schema", () => {
    const receipt = makeReceipt();

    expect(receiptHash({ ...receipt, internalNote: "do not hash" } as never)).toBe(
      receiptHash(receipt),
    );
  });
});

describe("signReceipt and verifyReceipt", () => {
  it("verifies an envelope signed by the policy service key", () => {
    const { privateKey, publicKey } = makeKeypair();
    const receipt = makeReceipt();
    const envelope = { receipt, publicKey, signature: signReceipt(receipt, privateKey) };

    expect(verifyReceipt(envelope)).toBe(true);
    expect(ReceiptEnvelope.parse(envelope).receipt.requestId).toBe("req_01");
  });

  it("verifies a refusal with reasons and no route", () => {
    const { privateKey, publicKey } = makeKeypair();
    const receipt = makeReceipt({
      outcome: "refuse",
      reasons: ["OVER_PER_PAYMENT_CAP", "OVER_DAILY_CAP"],
      route: undefined,
    });

    expect(verifyReceipt({ receipt, publicKey, signature: signReceipt(receipt, privateKey) })).toBe(
      true,
    );
  });

  it("rejects a receipt changed after signing", () => {
    const { privateKey, publicKey } = makeKeypair();
    const receipt = makeReceipt();
    const envelope = {
      receipt: { ...receipt, amountDrops: "9999999" },
      publicKey,
      signature: signReceipt(receipt, privateKey),
    };

    expect(verifyReceipt(envelope)).toBe(false);
  });

  it("rejects a signature from a different key", () => {
    const signer = makeKeypair();
    const attacker = makeKeypair();
    const receipt = makeReceipt();
    const envelope = {
      receipt,
      publicKey: attacker.publicKey,
      signature: signReceipt(receipt, signer.privateKey),
    };

    expect(verifyReceipt(envelope)).toBe(false);
  });

  it("rejects malformed envelopes and bad signatures", () => {
    const { publicKey } = makeKeypair();
    const receipt = makeReceipt();

    expect(verifyReceipt({ receipt, publicKey })).toBe(false);
    expect(verifyReceipt({ receipt, publicKey, signature: "00" })).toBe(false);
    expect(verifyReceipt(null)).toBe(false);
  });
});

describe("Receipt schema", () => {
  it("rejects unknown outcomes, routes and reason codes", () => {
    expect(() => Receipt.parse(makeReceipt({ outcome: "paid" } as never))).toThrow();
    expect(() => Receipt.parse(makeReceipt({ route: "multisig" } as never))).toThrow();
    expect(() => Receipt.parse(makeReceipt({ reasons: ["SOMETHING_ELSE"] } as never))).toThrow();
  });

  it("rejects a zero or fractional amount and an invalid mandate version", () => {
    expect(() => Receipt.parse(makeReceipt({ amountDrops: "0" }))).toThrow();
    expect(() => Receipt.parse(makeReceipt({ amountDrops: "1.5" }))).toThrow();
    expect(() => Receipt.parse(makeReceipt({ mandateVersion: 0 }))).toThrow();
  });
});
