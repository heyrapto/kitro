import type { Mandate } from "@kitro/core";
import { describe, expect, it } from "vitest";
import { evaluate, type Request, type State } from "./evaluate";

const PAYEE_CHANNEL = "rSupplierChannel";
const PAYEE_PAYMENT = "rSupplierPayment";
const PAYEE_UNKNOWN = "rSupplierUnknown";

function makeMandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    version: 1,
    operator: "rOperator",
    network: "xrpl:1",
    treasury: "rTreasury",
    perPaymentMaxDrops: "10000000",
    dailyMaxDrops: "50000000",
    requireApprovalAboveDrops: "5000000",
    payees: [
      { address: PAYEE_CHANNEL, name: "Channel Supplier", route: "channel" },
      { address: PAYEE_PAYMENT, name: "Payment Supplier", route: "payment" },
    ],
    newPayeeRoute: "escrow",
    escrowMaxLockSeconds: 86400,
    paused: false,
    issuedAt: "2026-11-12T10:00:00Z",
    ...overrides,
  };
}

function makeRequest(overrides: Partial<Request> = {}): Request {
  return { payee: PAYEE_PAYMENT, amountDrops: "4000000", ...overrides };
}

function makeState(overrides: Partial<State> = {}): State {
  return { spentTodayDrops: 0n, invoiceSeen: false, addressChanged: false, ...overrides };
}

describe("evaluate", () => {
  it("refuses without a mandate", () => {
    expect(evaluate(null, makeRequest(), makeState())).toEqual({
      outcome: "refuse",
      reasons: ["NO_MANDATE"],
    });
  });

  it("refuses while paused", () => {
    expect(evaluate(makeMandate({ paused: true }), makeRequest(), makeState())).toEqual({
      outcome: "refuse",
      reasons: ["PAUSED"],
    });
  });

  it("refuses a duplicate invoice", () => {
    expect(evaluate(makeMandate(), makeRequest(), makeState({ invoiceSeen: true }))).toEqual({
      outcome: "refuse",
      reasons: ["DUPLICATE_INVOICE"],
    });
  });

  it.each(["0", "-1", "1.5", "abc", "", " 1"])("refuses the bad amount %j", (amountDrops) => {
    expect(evaluate(makeMandate(), makeRequest({ amountDrops }), makeState())).toEqual({
      outcome: "refuse",
      reasons: ["BAD_AMOUNT"],
    });
  });

  it("refuses an amount over the per-payment cap", () => {
    expect(evaluate(makeMandate(), makeRequest({ amountDrops: "10000001" }), makeState())).toEqual({
      outcome: "refuse",
      reasons: ["OVER_PER_PAYMENT_CAP"],
    });
  });

  it("refuses an amount that pushes today over the daily cap", () => {
    expect(
      evaluate(
        makeMandate(),
        makeRequest({ amountDrops: "9000000" }),
        makeState({ spentTodayDrops: 41000001n }),
      ),
    ).toEqual({ outcome: "refuse", reasons: ["OVER_DAILY_CAP"] });
  });

  it("collects both cap failures", () => {
    expect(
      evaluate(
        makeMandate(),
        makeRequest({ amountDrops: "11000000" }),
        makeState({ spentTodayDrops: 50000000n }),
      ),
    ).toEqual({
      outcome: "refuse",
      reasons: ["OVER_PER_PAYMENT_CAP", "OVER_DAILY_CAP"],
    });
  });

  it("allows exactly at the per-payment cap", () => {
    expect(
      evaluate(
        makeMandate({ requireApprovalAboveDrops: "10000000" }),
        makeRequest({ amountDrops: "10000000" }),
        makeState(),
      ),
    ).toEqual({ outcome: "allow", route: "payment" });
  });

  it("allows exactly at the daily cap", () => {
    expect(
      evaluate(
        makeMandate({ requireApprovalAboveDrops: "10000000" }),
        makeRequest({ amountDrops: "10000000" }),
        makeState({ spentTodayDrops: 40000000n }),
      ),
    ).toEqual({ outcome: "allow", route: "payment" });
  });

  it("holds a payment above the approval threshold", () => {
    expect(evaluate(makeMandate(), makeRequest({ amountDrops: "6000000" }), makeState())).toEqual({
      outcome: "hold",
      reasons: ["NEEDS_APPROVAL_AMOUNT"],
    });
  });

  it("holds a changed payee address", () => {
    expect(evaluate(makeMandate(), makeRequest(), makeState({ addressChanged: true }))).toEqual({
      outcome: "hold",
      reasons: ["PAYEE_ADDRESS_CHANGED"],
    });
  });

  it("collects both hold reasons", () => {
    expect(
      evaluate(
        makeMandate(),
        makeRequest({ amountDrops: "6000000" }),
        makeState({ addressChanged: true }),
      ),
    ).toEqual({ outcome: "hold", reasons: ["PAYEE_ADDRESS_CHANGED", "NEEDS_APPROVAL_AMOUNT"] });
  });

  it("lets a cap refusal win over a hold", () => {
    expect(evaluate(makeMandate(), makeRequest({ amountDrops: "11000000" }), makeState())).toEqual({
      outcome: "refuse",
      reasons: ["OVER_PER_PAYMENT_CAP"],
    });
  });

  it("routes a known channel payee to the channel", () => {
    expect(evaluate(makeMandate(), makeRequest({ payee: PAYEE_CHANNEL }), makeState())).toEqual({
      outcome: "allow",
      route: "channel",
    });
  });

  it("routes a known payment payee to multisig payment", () => {
    expect(evaluate(makeMandate(), makeRequest({ payee: PAYEE_PAYMENT }), makeState())).toEqual({
      outcome: "allow",
      route: "payment",
    });
  });

  it("routes an unknown payee to escrow when configured", () => {
    expect(evaluate(makeMandate(), makeRequest({ payee: PAYEE_UNKNOWN }), makeState())).toEqual({
      outcome: "allow",
      route: "escrow",
    });
  });

  it("refuses an unknown payee when escrow is disabled", () => {
    expect(
      evaluate(
        makeMandate({ newPayeeRoute: "refuse" }),
        makeRequest({ payee: PAYEE_UNKNOWN }),
        makeState(),
      ),
    ).toEqual({ outcome: "refuse", reasons: ["PAYEE_NOT_ALLOWED"] });
  });
});
