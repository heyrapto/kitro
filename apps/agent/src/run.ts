import { readFileSync, existsSync } from "node:fs";
import { KitroClient } from "@kitro/client";
import { extractInvoice } from "./extract";

const SAMPLE_INVOICE = `
INVOICE #INV-2026-904
Date: 2026-11-13
Due Date: 2026-11-20
Vendor: Apex Cloud Infrastructure Ltd.
Payee XRPL Address: rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh

Description:
1. High-Performance Compute Cluster (November 2026): 0.50 XRP
2. Bandwidth & Storage Egress: 0.25 XRP

Total Due: 0.75 XRP (750,000 drops)
Reference: PO-89021
`;

async function main() {
  console.log("=================================================");
  console.log("             KITRO AUTONOMOUS AGENT              ");
  console.log("=================================================\n");

  let invoiceText: string;
  const argPath = process.argv[2];

  if (argPath && existsSync(argPath)) {
    console.log(`Reading invoice from file: ${argPath}`);
    invoiceText = readFileSync(argPath, "utf-8");
  } else {
    console.log("No invoice file provided. Using sample supplier invoice:");
    invoiceText = SAMPLE_INVOICE;
  }

  console.log("\n📄 Invoice Content:");
  console.log(invoiceText.trim());

  console.log("\n🤖 Extracting structured invoice intelligence...");
  const extracted = await extractInvoice(invoiceText);

  console.log("\n✓ Extraction Result:");
  console.log(`  Invoice ID:   ${extracted.invoiceId}`);
  console.log(`  Supplier:     ${extracted.supplierName}`);
  console.log(`  XRPL Address: ${extracted.supplierXrplAddress ?? "(none found)"}`);
  console.log(`  Amount:       ${extracted.amountRaw} (${extracted.amountDrops ?? 0} drops)`);
  console.log(`  Confidence:   ${Math.round(extracted.confidence * 100)}%`);

  if (extracted.uncertain.length > 0) {
    console.log(`  ⚠️ Uncertain:  ${extracted.uncertain.join(", ")}`);
  }

  const client = new KitroClient();

  // If no XRPL address in document, check registered suppliers
  let payeeAddress = extracted.supplierXrplAddress;
  if (!payeeAddress) {
    console.log("\n🔍 Looking up supplier in registered policy directory...");
    try {
      const { suppliers } = await client.getSuppliers();
      const match = suppliers.find(
        (s) => s.name.toLowerCase() === extracted.supplierName.toLowerCase(),
      );
      if (match) {
        payeeAddress = match.address;
        console.log(`✓ Resolved registered address: ${payeeAddress}`);
      }
    } catch {
      // ignore
    }
  }

  if (!payeeAddress) {
    console.error("\n❌ Cannot request payment: No XRPL destination address found.");
    console.error("The agent cannot invent an address. Human review required.\n");
    process.exit(1);
  }

  if (!extracted.amountDrops || extracted.amountDrops === "0") {
    console.error("\n❌ Cannot request payment: Amount could not be converted to XRP drops.");
    process.exit(1);
  }

  console.log("\n📤 Submitting payment request to independent Policy Service...");
  console.log("   (Rule: The agent proposes. The policy service disposes.)");

  const response = await client.requestPayment({
    invoiceId: extracted.invoiceId,
    payee: payeeAddress,
    amountDrops: extracted.amountDrops,
    memo: extracted.memo ?? extracted.invoiceId,
  });

  console.log("\n=================================================");
  console.log("            POLICY SERVICE DECISION              ");
  console.log("=================================================");
  console.log(`Request ID: ${response.id}`);
  console.log(`Status:     ${response.status.toUpperCase()}`);
  console.log(`Outcome:    ${response.decision.outcome.toUpperCase()}`);

  if (response.decision.outcome === "allow") {
    console.log(`Route:      ${response.decision.route?.toUpperCase()}`);
    console.log(`✓ Payment authorized by mandate version ${response.receipt.receipt.mandateVersion}`);
    console.log(`✓ Signed Audit Receipt: ${response.receipt.signature.slice(0, 32)}...`);
  } else if (response.decision.outcome === "hold") {
    console.log(`Reasons:    ${response.decision.reasons?.join(", ")}`);
    console.log("⏳ Payment held for operator approval in dashboard.");
  } else {
    console.log(`Reasons:    ${response.decision.reasons?.join(", ")}`);
    console.log("❌ Payment refused by deterministic policy limits.");
  }

  console.log("\nAgent turn complete.");
}

main().catch((err) => {
  console.error("\n❌ Agent error:", err.message);
  process.exit(1);
});
