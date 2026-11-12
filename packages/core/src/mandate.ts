import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import { deriveAddress, sign, verify } from "ripple-keypairs";
import { z } from "zod";

const DropString = z.string().regex(/^\d+$/, "Must be a whole number of drops");

export const MandatePayee = z.object({
  address: z.string().min(1),
  name: z.string().min(1),
  route: z.enum(["channel", "payment"]),
  tag: z.number().int().nonnegative().optional(),
});

export const Mandate = z.object({
  version: z.number().int().positive(),
  operator: z.string().min(1),
  network: z.string().min(1),
  treasury: z.string().min(1),
  perPaymentMaxDrops: DropString,
  dailyMaxDrops: DropString,
  requireApprovalAboveDrops: DropString,
  payees: z.array(MandatePayee),
  newPayeeRoute: z.enum(["escrow", "refuse"]),
  escrowMaxLockSeconds: z.number().int().positive(),
  paused: z.boolean(),
  issuedAt: z.string().min(1),
});

export const MandateEnvelope = z.object({
  mandate: Mandate,
  publicKey: z.string().min(1),
  signature: z.string().min(1),
});

export type MandatePayee = z.infer<typeof MandatePayee>;
export type Mandate = z.infer<typeof Mandate>;
export type MandateEnvelope = z.infer<typeof MandateEnvelope>;

/**
 * RFC 8785 canonical JSON, SHA-256, uppercase hex. The same bytes on every
 * machine so a signature always verifies.
 */
export function mandateHash(mandate: Mandate): string {
  const canonical = canonicalize(Mandate.parse(mandate));
  if (canonical === undefined) {
    throw new Error("Mandate could not be canonicalized");
  }
  return createHash("sha256").update(canonical).digest("hex").toUpperCase();
}

export function signMandate(mandate: Mandate, privateKey: string): string {
  return sign(mandateHash(mandate), privateKey);
}

export function verifyMandate(envelope: MandateEnvelope | unknown): boolean {
  const parsed = MandateEnvelope.safeParse(envelope);
  if (!parsed.success) return false;

  const { mandate, publicKey, signature } = parsed.data;

  try {
    if (deriveAddress(publicKey) !== mandate.operator) return false;
    return verify(mandateHash(mandate), signature, publicKey);
  } catch {
    return false;
  }
}
