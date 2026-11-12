import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import { sign, verify } from "ripple-keypairs";
import { z } from "zod";
import { REASON_CODES } from "./reasons";

const DropString = z.string().regex(/^[1-9]\d*$/, "Must be a positive whole number of drops");

export const Receipt = z.object({
  requestId: z.string().min(1),
  invoiceId: z.string().min(1),
  payee: z.string().min(1),
  amountDrops: DropString,
  outcome: z.enum(["allow", "hold", "refuse"]),
  reasons: z.array(z.enum(REASON_CODES)),
  route: z.enum(["channel", "payment", "escrow"]).optional(),
  mandateVersion: z.number().int().positive(),
  txHash: z.string().min(1).optional(),
  issuedAt: z.string().min(1),
});

export const ReceiptEnvelope = z.object({
  receipt: Receipt,
  publicKey: z.string().min(1),
  signature: z.string().min(1),
});

export type Receipt = z.infer<typeof Receipt>;
export type ReceiptEnvelope = z.infer<typeof ReceiptEnvelope>;

/**
 * RFC 8785 canonical JSON, SHA-256, uppercase hex. This is the digest written
 * into the MemoData of every transaction sent for the receipt.
 */
export function receiptHash(receipt: Receipt): string {
  const canonical = canonicalize(Receipt.parse(receipt));
  if (canonical === undefined) {
    throw new Error("Receipt could not be canonicalized");
  }
  return createHash("sha256").update(canonical).digest("hex").toUpperCase();
}

export function signReceipt(receipt: Receipt, privateKey: string): string {
  return sign(receiptHash(receipt), privateKey);
}

export function verifyReceipt(envelope: ReceiptEnvelope | unknown): boolean {
  const parsed = ReceiptEnvelope.safeParse(envelope);
  if (!parsed.success) return false;

  const { receipt, publicKey, signature } = parsed.data;

  try {
    return verify(receiptHash(receipt), signature, publicKey);
  } catch {
    return false;
  }
}
