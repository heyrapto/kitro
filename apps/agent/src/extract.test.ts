import { describe, expect, it } from "vitest";
import { extractInvoice } from "./extract";

const SAMPLE_TEXT = `
INVOICE #INV-4091
Supplier: Global Compute Corp
Destination Address: rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
Amount: 1.25 XRP
Date: 2026-11-13
`;

describe("extractInvoice", () => {
  it("extracts structured invoice fields using rule engine fallback", async () => {
    const result = await extractInvoice(SAMPLE_TEXT);

    expect(result.invoiceId).toBe("INV-4091");
    expect(result.supplierXrplAddress).toBe("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
    expect(result.amountDrops).toBe("1250000");
    expect(result.currency).toBe("XRP");
    expect(result.invoiceDate).toBe("2026-11-13");
  });

  it("identifies missing address as uncertain field", async () => {
    const textWithoutAddress = `
    INVOICE #INV-NO-ADDR
    Supplier: Unknown Cloud
    Total Due: 50 XRP
    `;
    const result = await extractInvoice(textWithoutAddress);

    expect(result.supplierXrplAddress).toBeUndefined();
    expect(result.uncertain).toContain("supplierXrplAddress");
  });
});
