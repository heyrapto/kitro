import { z } from "zod";

const DropString = z.string().regex(/^[1-9]\d*$/, "Must be a positive whole number of drops");

export const PaymentRequestEvidence = z.object({
  poNumber: z.string().min(1).optional(),
  deliveryRef: z.string().min(1).optional(),
});

export const PaymentRequest = z.object({
  invoiceId: z.string().min(1),
  payee: z.string().min(1),
  amountDrops: DropString,
  destinationTag: z.number().int().min(0).max(0xffffffff).optional(),
  memo: z.string().optional(),
  evidence: PaymentRequestEvidence.optional(),
});

export type PaymentRequestEvidence = z.infer<typeof PaymentRequestEvidence>;
export type PaymentRequest = z.infer<typeof PaymentRequest>;
