import { describe, expect, it } from "vitest";
import { RECEIPT_MEMO_TYPE, hexToText, receiptMemo, textToHex } from "./memo";

describe("textToHex and hexToText", () => {
  it("round-trips plain text", () => {
    expect(hexToText(textToHex("kitro/receipt"))).toBe("kitro/receipt");
  });

  it("round-trips non-ASCII text", () => {
    expect(hexToText(textToHex("café ☕"))).toBe("café ☕");
  });

  it("emits uppercase hex", () => {
    expect(textToHex("kitro/receipt")).toBe(textToHex("kitro/receipt").toUpperCase());
  });

  it("rejects odd-length and non-hex input", () => {
    expect(() => hexToText("abc")).toThrow();
    expect(() => hexToText("zz")).toThrow();
  });
});

describe("receiptMemo", () => {
  it("builds a memo with the receipt type and hash", () => {
    const hash = "AB".repeat(32);
    const memo = receiptMemo(hash);

    expect(RECEIPT_MEMO_TYPE).toBe(textToHex("kitro/receipt"));
    expect(memo).toEqual({
      Memo: {
        MemoType: RECEIPT_MEMO_TYPE,
        MemoData: hash,
      },
    });
  });

  it("uppercases the hash", () => {
    expect(receiptMemo("ab".repeat(32)).Memo?.MemoData).toBe("AB".repeat(32));
  });

  it("rejects a hash that is not 32 bytes of hex", () => {
    expect(() => receiptMemo("AB")).toThrow();
    expect(() => receiptMemo("zz".repeat(32))).toThrow();
  });
});
