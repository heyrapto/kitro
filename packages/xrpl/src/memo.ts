import type { Memo } from "xrpl";

const HEX = /^[0-9a-fA-F]*$/;
const SHA256_HEX = /^[0-9a-fA-F]{64}$/;

export const RECEIPT_MEMO_TYPE = textToHex("kitro/receipt");

export function textToHex(text: string): string {
  return Buffer.from(text, "utf8").toString("hex").toUpperCase();
}

export function hexToText(hex: string): string {
  assertHex(hex);
  return Buffer.from(hex, "hex").toString("utf8");
}

/**
 * Memos are public forever, so only the receipt hash goes on-ledger. Never put
 * invoice text or personal data here.
 */
export function receiptMemo(receiptHash: string): Memo {
  if (!SHA256_HEX.test(receiptHash)) {
    throw new Error("Receipt hash must be a 32-byte hex string");
  }

  return {
    Memo: {
      MemoType: RECEIPT_MEMO_TYPE,
      MemoData: receiptHash.toUpperCase(),
    },
  };
}

function assertHex(value: string): void {
  if (value.length % 2 !== 0 || !HEX.test(value)) {
    throw new Error("Expected an even-length hex string");
  }
}
