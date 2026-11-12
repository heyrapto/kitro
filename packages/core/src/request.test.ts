import { describe, expect, it } from "vitest";
import { PaymentRequest } from "./request";

const minimal = {
  invoiceId: "INV-1042",
  payee: "rSupplierAddress",
  amountDrops: "2500000",
};

describe("PaymentRequest", () => {
  it("accepts a minimal request", () => {
    expect(PaymentRequest.parse(minimal)).toEqual(minimal);
  });

  it("accepts optional tag, memo and evidence", () => {
    const request = {
      ...minimal,
      destinationTag: 12,
      memo: "November hosting",
      evidence: { poNumber: "PO-7", deliveryRef: "GRN-3" },
    };

    expect(PaymentRequest.parse(request)).toEqual(request);
  });

  it.each(["0", "-1", "1.5", "abc", "", "01"])("rejects the bad amount %j", (amountDrops) => {
    expect(() => PaymentRequest.parse({ ...minimal, amountDrops })).toThrow();
  });

  it("rejects an empty invoice id or payee", () => {
    expect(() => PaymentRequest.parse({ ...minimal, invoiceId: "" })).toThrow();
    expect(() => PaymentRequest.parse({ ...minimal, payee: "" })).toThrow();
  });

  it("rejects invalid destination tags", () => {
    expect(() => PaymentRequest.parse({ ...minimal, destinationTag: -1 })).toThrow();
    expect(() => PaymentRequest.parse({ ...minimal, destinationTag: 1.5 })).toThrow();
    expect(() => PaymentRequest.parse({ ...minimal, destinationTag: 0x100000000 })).toThrow();
  });

  it("strips fields the agent is not allowed to send", () => {
    const parsed = PaymentRequest.parse({ ...minimal, approved: true, route: "payment" });

    expect(parsed).not.toHaveProperty("approved");
    expect(parsed).not.toHaveProperty("route");
  });
});
