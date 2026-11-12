import { describe, expect, it } from "vitest";
import { assertValidatedSuccess, transactionResultCode } from "./client";

describe("transactionResultCode", () => {
  it("reads the code from transaction metadata", () => {
    expect(transactionResultCode({ meta: { TransactionResult: "tesSUCCESS" } })).toBe("tesSUCCESS");
    expect(transactionResultCode({ meta: { TransactionResult: "tecNO_DST" } })).toBe("tecNO_DST");
  });

  it("returns undefined when metadata is absent or binary", () => {
    expect(transactionResultCode({})).toBeUndefined();
    expect(transactionResultCode({ meta: "DEADBEEF" })).toBeUndefined();
    expect(transactionResultCode({ meta: null })).toBeUndefined();
    expect(transactionResultCode({ meta: {} })).toBeUndefined();
  });
});

describe("assertValidatedSuccess", () => {
  it("returns a successful result", () => {
    const result = { hash: "ABC123", meta: { TransactionResult: "tesSUCCESS" } };

    expect(assertValidatedSuccess(result)).toBe(result);
  });

  it("throws with the hash for a failed transaction", () => {
    expect(() =>
      assertValidatedSuccess({
        hash: "ABC123",
        meta: { TransactionResult: "tecUNFUNDED_PAYMENT" },
      }),
    ).toThrow("XRPL tecUNFUNDED_PAYMENT: ABC123");
  });

  it("throws when the result was not validated or has no metadata", () => {
    expect(() => assertValidatedSuccess({ hash: "ABC123" })).toThrow("XRPL unknown: ABC123");
  });
});
