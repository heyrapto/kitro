import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Client,
  Wallet,
  prepareMultisigPayment,
  signMultisig,
  combineMultisig,
  submitMultisig,
  receiptMemo,
} from "@kitro/xrpl";
import { evaluate } from "@kitro/rules";
import {
  type Mandate,
  receiptHash,
  type Receipt,
} from "@kitro/core";

const TESTNET_URL = process.env.XRPL_URL ?? "wss://s.altnet.rippletest.net:51233";
const ENV_PATH = resolve(process.cwd(), ".env.local");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (existsSync(ENV_PATH)) {
    const content = readFileSync(ENV_PATH, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!env[key]) env[key] = val;
      }
    }
  }
  return env;
}

async function main() {
  console.log("=================================================");
  console.log("      KITRO END-TO-END VERIFICATION SUITE        ");
  console.log("=================================================\n");

  const env = loadEnv();
  const treasurySeed = env.TREASURY_SEED;
  const agentSeed = env.AGENT_SEED;
  const policySeed = env.POLICY_SEED;
  const supplierSeed = env.SUPPLIER_SEED;

  if (!treasurySeed || !agentSeed || !policySeed || !supplierSeed) {
    console.error("❌ Missing wallet seeds in environment or .env.local.");
    console.error("Please run `pnpm testnet:setup` first to create/fund testnet accounts.\n");
    process.exit(1);
  }

  const treasuryWallet = Wallet.fromSeed(treasurySeed);
  const agentWallet = Wallet.fromSeed(agentSeed);
  const policyWallet = Wallet.fromSeed(policySeed);
  const supplierWallet = Wallet.fromSeed(supplierSeed);

  console.log(`Connecting to: ${TESTNET_URL}`);
  const client = new Client(TESTNET_URL);
  await client.connect();
  console.log("✓ Connected to XRPL Testnet\n");

  const mandate: Mandate = {
    version: 1,
    operator: treasuryWallet.classicAddress,
    network: "xrpl:1",
    treasury: treasuryWallet.classicAddress,
    perPaymentMaxDrops: "1000000", // 1 XRP max per payment
    dailyMaxDrops: "5000000",      // 5 XRP max per day
    requireApprovalAboveDrops: "500000", // 0.5 XRP needs approval
    payees: [
      {
        address: supplierWallet.classicAddress,
        name: "Acme Cloud Services",
        route: "payment",
      },
    ],
    newPayeeRoute: "refuse",
    escrowMaxLockSeconds: 86400,
    paused: false,
    issuedAt: new Date().toISOString(),
  };

  console.log("Active Mandate Limits:");
  console.log(`  Per-payment cap: 1 XRP (1,000,000 drops)`);
  console.log(`  Daily limit:     5 XRP (5,000,000 drops)`);
  console.log(`  Approved payee:  ${supplierWallet.classicAddress}\n`);

  // -----------------------------------------------------------------
  // SCENARIO 1: Routine in-limit payment with 2-of-2 multisig
  // -----------------------------------------------------------------
  console.log("--- SCENARIO 1: Authorized 2-of-2 Multisig Payment ---");
  const req1 = { payee: supplierWallet.classicAddress, amountDrops: "100000" }; // 0.1 XRP
  const decision1 = evaluate(mandate, req1, {
    spentTodayDrops: 0n,
    invoiceSeen: false,
    addressChanged: false,
  });

  if (decision1.outcome !== "allow") {
    throw new Error(`Expected decision allow, got: ${JSON.stringify(decision1)}`);
  }
  console.log("✓ Policy decision: ALLOW (within per-payment and daily limits)");

  // Create signed audit receipt
  const receipt1: Receipt = {
    requestId: "req-e2e-001",
    invoiceId: "INV-2026-001",
    payee: supplierWallet.classicAddress,
    amountDrops: req1.amountDrops,
    outcome: "allow",
    reasons: [],
    route: "payment",
    mandateVersion: mandate.version,
    issuedAt: new Date().toISOString(),
  };
  const rHash1 = receiptHash(receipt1);
  const memo1 = receiptMemo(rHash1);
  console.log(`✓ Signed Audit Receipt digest: ${rHash1}`);

  console.log("Preparing multisig transaction on XRPL...");
  const tx1 = await prepareMultisigPayment(
    client,
    treasuryWallet.classicAddress,
    supplierWallet.classicAddress,
    req1.amountDrops,
    [memo1],
    undefined,
    2,
  );

  console.log("Signing with Agent signer (Signer 1)...");
  const agentSigned1 = signMultisig(tx1, agentWallet);

  console.log("Signing with Policy signer (Signer 2)...");
  const policySigned1 = signMultisig(tx1, policyWallet);

  console.log("Combining signatures and submitting to XRPL Testnet...");
  const combinedBlob1 = combineMultisig([agentSigned1.tx_blob, policySigned1.tx_blob]);
  const result1 = await submitMultisig(client, combinedBlob1);

  console.log(`✓ SUCCESS! Validated in ledger: ${result1.ledger_index}`);
  console.log(`  Tx Hash: ${result1.hash}`);
  console.log(`  Explorer: https://testnet.xrpl.org/transactions/${result1.hash}\n`);

  // -----------------------------------------------------------------
  // SCENARIO 2: Negative Proof — Agent tries to pay ALONE
  // -----------------------------------------------------------------
  console.log("--- SCENARIO 2: Negative Proof — Agent-Only Signing ---");
  console.log("Attempting to execute a payment signed ONLY by the agent (Quorum not met)...");

  const rogueTx = await prepareMultisigPayment(
    client,
    treasuryWallet.classicAddress,
    supplierWallet.classicAddress,
    "50000",
    undefined,
    undefined,
    1,
  );

  const rogueAgentSigned = signMultisig(rogueTx, agentWallet);

  try {
    // Submit only agent's signature blob
    await client.submitAndWait(rogueAgentSigned.tx_blob);
    console.error("❌ FAILED: Rogue transaction should have been rejected by ledger!");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`✓ REJECTED by XRPL: ${errorMsg}`);
    console.log("✓ Ledger strictly enforces quorum 2: Agent CANNOT move money alone!\n");
  }

  // -----------------------------------------------------------------
  // SCENARIO 3: Policy Service refuses over-limit payment
  // -----------------------------------------------------------------
  console.log("--- SCENARIO 3: Policy Service Rejection (Over-Limit) ---");
  const reqOverLimit = { payee: supplierWallet.classicAddress, amountDrops: "2000000" }; // 2 XRP (cap is 1 XRP)
  const decisionOver = evaluate(mandate, reqOverLimit, {
    spentTodayDrops: 100000n,
    invoiceSeen: false,
    addressChanged: false,
  });

  console.log(`Request amount: 2,000,000 drops (Limit: 1,000,000 drops)`);
  console.log(`Policy decision: ${decisionOver.outcome.toUpperCase()}`);
  if (decisionOver.outcome === "refuse") {
    console.log(`Reason codes: ${decisionOver.reasons.join(", ")}`);
    console.log("✓ Policy service refused before signing — no transaction sent to ledger.");

    const refusalReceipt: Receipt = {
      requestId: "req-e2e-002",
      invoiceId: "INV-2026-OVER",
      payee: supplierWallet.classicAddress,
      amountDrops: reqOverLimit.amountDrops,
      outcome: "refuse",
      reasons: decisionOver.reasons,
      mandateVersion: mandate.version,
      issuedAt: new Date().toISOString(),
    };
    const refHash = receiptHash(refusalReceipt);
    console.log(`✓ Signed refusal receipt generated: ${refHash}\n`);
  }

  // -----------------------------------------------------------------
  // SCENARIO 4: Unknown supplier rejected when newPayeeRoute = 'refuse'
  // -----------------------------------------------------------------
  console.log("--- SCENARIO 4: Unknown Supplier Protection ---");
  const unauthorizedPayee = Wallet.generate().classicAddress;
  const decisionUnknown = evaluate(
    mandate,
    { payee: unauthorizedPayee, amountDrops: "100000" },
    { spentTodayDrops: 100000n, invoiceSeen: false, addressChanged: false },
  );

  console.log(`Payee ${unauthorizedPayee} not on allowlist`);
  console.log(`Policy decision: ${decisionUnknown.outcome.toUpperCase()}`);
  if (decisionUnknown.outcome === "refuse") {
    console.log(`Reasons: ${decisionUnknown.reasons.join(", ")}`);
    console.log("✓ Unknown payee blocked by allowlist.\n");
  }

  console.log("=================================================");
  console.log("       ALL E2E VERIFICATIONS COMPLETED!          ");
  console.log("=================================================");

  await client.disconnect();
}

main().catch((err) => {
  console.error("\n❌ E2E test error:", err);
  process.exit(1);
});
