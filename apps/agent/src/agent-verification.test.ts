import { describe, expect, it } from "vitest";
import { extractInvoice, ExtractedInvoice } from "./extract.js";
import { evaluate } from "@kitro/rules";
import type { Mandate, PaymentRequest } from "@kitro/core";

describe("Forensic AI Agent Invoice Intelligence & Policy Boundary Verification", () => {
  const mockMandate: Mandate = {
    version: 1,
    operator: "rOperator1111111111111111111111111",
    network: "xrpl:testnet",
    treasury: "rTreasury1111111111111111111111111",
    perPaymentMaxDrops: "2000000", // 2 XRP
    dailyMaxDrops: "10000000",     // 10 XRP
    requireApprovalAboveDrops: "1000000", // 1 XRP
    payees: [
      {
        address: "rApprovedVendor1111111111111111",
        name: "Acme Cloud Services",
        route: "payment",
      },
    ],
    newPayeeRoute: "refuse",
    escrowMaxLockSeconds: 86400,
    paused: false,
    issuedAt: "2026-11-13T12:00:00.000Z",
  };

  it("Case 1: Valid invoice produces full schema-validated extraction", async () => {
    const rawInvoice = `Acme Cloud Services
Invoice Number: INV-2026-001
Date: 2026-11-13
Due Date: 2026-11-20
Payee Address: rApprovedVendor1111111111111111
Amount: 0.75 XRP
Description: Dedicated cloud hosting and GPU inference`;

    const extracted = await extractInvoice(rawInvoice);
    const parseResult = ExtractedInvoice.safeParse(extracted);

    expect(parseResult.success).toBe(true);
    expect(extracted.invoiceId).toBe("INV-2026-001");
    expect(extracted.supplierXrplAddress).toBe("rApprovedVendor1111111111111111");
    expect(extracted.amountDrops).toBe("750000");
    expect(extracted.currency).toBe("XRP");
    expect(extracted.confidence).toBeGreaterThanOrEqual(0.9);
    expect(extracted.uncertain).toHaveLength(0);
  });

  it("Case 2: Missing supplier address is safely captured with uncertainty flag", async () => {
    const rawInvoice = `Acme Cloud Services
Invoice: INV-NO-ADDRESS-99
Date: 2026-11-13
Total Due: 1.50 XRP
Please remit payment via bank wire or contact support for XRPL address.`;

    const extracted = await extractInvoice(rawInvoice);
    const parseResult = ExtractedInvoice.safeParse(extracted);

    expect(parseResult.success).toBe(true);
    expect(extracted.invoiceId).toBe("INV-NO-ADDRESS-99");
    expect(extracted.supplierXrplAddress).toBeUndefined();
    expect(extracted.uncertain).toContain("supplierXrplAddress");
    expect(extracted.confidence).toBeLessThan(0.9);

    // Security assertion: Cannot construct valid PaymentRequest without payee address
    expect(() => {
      if (!extracted.supplierXrplAddress) {
        throw new Error("CANNOT_REQUEST_PAYMENT_WITHOUT_PAYEE");
      }
    }).toThrow("CANNOT_REQUEST_PAYMENT_WITHOUT_PAYEE");
  });

  it("Case 3: Invalid or unparseable amount flags uncertainty and cannot settle", async () => {
    const rawInvoice = `Supplier: Acme Cloud Services
Invoice ID: INV-BAD-AMOUNT-123
Payee: rApprovedVendor1111111111111111
Total: To be determined pending usage audit`;

    const extracted = await extractInvoice(rawInvoice);
    const parseResult = ExtractedInvoice.safeParse(extracted);

    expect(parseResult.success).toBe(true);
    expect(extracted.uncertain).toContain("amountDrops");

    // Attempting to evaluate without valid drops string fails
    const invalidReq: PaymentRequest = {
      invoiceId: extracted.invoiceId,
      payee: extracted.supplierXrplAddress ?? "rApprovedVendor1111111111111111",
      amountDrops: extracted.amountDrops ?? "0",
    };

    const decision = evaluate(mockMandate, invalidReq, {
      spentTodayDrops: 0n,
      invoiceSeen: false,
      addressChanged: false,
    });

    expect(decision.outcome).toBe("refuse");
    if (decision.outcome === "refuse") {
      expect(decision.reasons).toContain("BAD_AMOUNT");
    }
  });

  it("Case 4: Ambiguous invoice flags uncertainty for operator review", async () => {
    const rawInvoice = `Notice: Statement of Account #STMT-404 / PO-888
From: Unknown Subcontractor Corp
Total: $500 USD (equivalent to approx 1000 XRP at spot)
XRPL: rApprovedVendor1111111111111111`;

    const extracted = await extractInvoice(rawInvoice);
    expect(ExtractedInvoice.safeParse(extracted).success).toBe(true);
    expect(extracted.uncertain.length).toBeGreaterThan(0);
  });

  it("Case 5: Duplicate invoice is caught and blocked by policy referee", async () => {
    const req: PaymentRequest = {
      invoiceId: "INV-DUP-TEST",
      payee: "rApprovedVendor1111111111111111",
      amountDrops: "500000",
    };

    // First presentation: allowed
    const decision1 = evaluate(mockMandate, req, {
      spentTodayDrops: 0n,
      invoiceSeen: false,
      addressChanged: false,
    });
    expect(decision1.outcome).toBe("allow");

    // Second presentation (duplicate invoiceSeen = true): strictly refused
    const decision2 = evaluate(mockMandate, req, {
      spentTodayDrops: 500000n,
      invoiceSeen: true, // Seen previously
      addressChanged: false,
    });
    expect(decision2.outcome).toBe("refuse");
    if (decision2.outcome === "refuse") {
      expect(decision2.reasons).toContain("DUPLICATE_INVOICE");
    }
  });

  it("Core Architectural Guarantee: AI Agent intelligence CANNOT authorize itself", () => {
    // Over-limit request prepared by agent
    const overLimitReq: PaymentRequest = {
      invoiceId: "INV-AGENT-ROGUE-999",
      payee: "rApprovedVendor1111111111111111",
      amountDrops: "50000000", // 50 XRP (exceeds single payment cap of 2 XRP and daily cap of 10 XRP)
    };

    const refereeDecision = evaluate(mockMandate, overLimitReq, {
      spentTodayDrops: 0n,
      invoiceSeen: false,
      addressChanged: false,
    });

    // Policy referee rejects it regardless of what the agent wanted
    expect(refereeDecision.outcome).toBe("refuse");
    if (refereeDecision.outcome === "refuse") {
      expect(refereeDecision.reasons).toContain("OVER_PER_PAYMENT_CAP");
      expect(refereeDecision.reasons).toContain("OVER_DAILY_CAP");
    }
  });
});
