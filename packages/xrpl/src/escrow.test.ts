import cc from "five-bells-condition";
import { describe, expect, it } from "vitest";
import {
  RIPPLE_EPOCH,
  escrowCancel,
  escrowCreate,
  escrowFinish,
  fromRippleTime,
  newCondition,
  toRippleTime,
} from "./escrow";

const TREASURY = "rTreasury";
const PAYEE = "rSupplier";
const RELAYER = "rRelayer";
const CONDITION = "A".repeat(64);
const FULFILLMENT = "B".repeat(64);

describe("newCondition", () => {
  it("returns uppercase hex condition and fulfillment", () => {
    const result = newCondition();

    expect(result.condition).toMatch(/^[0-9A-F]+$/);
    expect(result.fulfillment).toMatch(/^[0-9A-F]+$/);
    expect(result.condition).not.toBe(result.fulfillment);
  });

  it("generates a different secret each time", () => {
    expect(newCondition().condition).not.toBe(newCondition().condition);
  });

  it("produces a fulfillment that matches its condition", () => {
    const result = newCondition();
    const parsed = cc.fromFulfillmentBinary(Buffer.from(result.fulfillment, "hex"));

    expect(parsed.getConditionBinary().toString("hex").toUpperCase()).toBe(result.condition);
  });
});

describe("Ripple time", () => {
  it("maps the epoch to zero", () => {
    expect(toRippleTime(RIPPLE_EPOCH)).toBe(0);
    expect(fromRippleTime(0)).toBe(RIPPLE_EPOCH);
  });

  it("round-trips a unix timestamp", () => {
    const unix = 1762941600;
    expect(fromRippleTime(toRippleTime(unix))).toBe(unix);
  });
});

describe("escrow transaction builders", () => {
  it("builds an EscrowCreate with a Ripple-time deadline", () => {
    const cancelAfterUnix = RIPPLE_EPOCH + 86400;

    expect(escrowCreate(TREASURY, PAYEE, "2500000", CONDITION, cancelAfterUnix)).toEqual({
      TransactionType: "EscrowCreate",
      Account: TREASURY,
      Destination: PAYEE,
      Amount: "2500000",
      Condition: CONDITION,
      CancelAfter: 86400,
    });
  });

  it("rejects non-positive escrow amounts", () => {
    expect(() => escrowCreate(TREASURY, PAYEE, "0", CONDITION, 0)).toThrow();
    expect(() => escrowCreate(TREASURY, PAYEE, "1.5", CONDITION, 0)).toThrow();
  });

  it("builds an EscrowFinish", () => {
    expect(escrowFinish(RELAYER, TREASURY, 42, CONDITION, FULFILLMENT)).toEqual({
      TransactionType: "EscrowFinish",
      Account: RELAYER,
      Owner: TREASURY,
      OfferSequence: 42,
      Condition: CONDITION,
      Fulfillment: FULFILLMENT,
    });
  });

  it("builds an EscrowCancel", () => {
    expect(escrowCancel(RELAYER, TREASURY, 42)).toEqual({
      TransactionType: "EscrowCancel",
      Account: RELAYER,
      Owner: TREASURY,
      OfferSequence: 42,
    });
  });
});
