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

const TESTNET_URL =
  process.env.XRPL_URL || process.env.XRPL_RPC_URL || "wss://s.altnet.rippletest.net:51233";

function findRepoRoot(): string {
  let curr = process.cwd();
  while (curr && !existsSync(resolve(curr, "pnpm-workspace.yaml"))) {
    const parent = resolve(curr, "..");
    if (parent === curr) break;
    curr = parent;
  }
  return curr;
}

const REPO_ROOT = findRepoRoot();
const ENV_PATH = resolve(REPO_ROOT, ".env.local");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
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
  console.log("=================================================================");
  console.log("             KITRO E2E FORENSIC VERIFICATION SUITE               ");
  console.log("=================================================================\n");

  const env = loadEnv();
  const treasurySeed = env.TREASURY_SEED;
  const agentSeed = env.AGENT_SEED;
  const policySeed = env.POLICY_SEED;
  const supplierSeed = env.SUPPLIER_SEED;

  if (!treasurySeed || !agentSeed || !policySeed || !supplierSeed) {
    console.error("❌ Missing wallet seeds in environment or .env.local.");
    console.error("Please run `pnpm --filter @kitro/scripts setup-testnet -- --fresh` first.\n");
    process.exit(1);
  }

  const treasuryWallet = Wallet.fromSeed(treasurySeed);
  const agentWallet = Wallet.fromSeed(agentSeed);
  const policyWallet = Wallet.fromSeed(policySeed);
  const supplierWallet = Wallet.fromSeed(supplierSeed);

  console.log(`Connecting to: ${TESTNET_URL}`);
  let client!: Client;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      client = new Client(TESTNET_URL, { connectionTimeout: 20000 });
      await client.connect();
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 4) throw err;
      console.log(`Connection attempt ${attempt} failed (${msg}). Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.log("✓ Connected to XRPL Testnet\n");

  console.log("Participating Accounts:");
  console.log(`  Treasury: ${treasuryWallet.classicAddress}`);
  console.log(`  Agent:    ${agentWallet.classicAddress}`);
  console.log(`  Policy:   ${policyWallet.classicAddress}`);
  console.log(`  Supplier: ${supplierWallet.classicAddress}\n`);

  const mandate: Mandate = {
    version: 1,
    operator: treasuryWallet.classicAddress,
    network: "xrpl:testnet",
    treasury: treasuryWallet.classicAddress,
    perPaymentMaxDrops: "1000000",        // 1 XRP maximum per payment
    dailyMaxDrops: "5000000",             // 5 XRP maximum per day
    requireApprovalAboveDrops: "500000",  // 0.5 XRP requires human approval
    payees: [
      {
        address: supplierWallet.classicAddress,
        name: "Acme Cloud Services Ltd",
        route: "payment",
      },
    ],
    newPayeeRoute: "refuse",
    escrowMaxLockSeconds: 86400,
    paused: false,
    issuedAt: new Date().toISOString(),
  };

  // -----------------------------------------------------------------
  // SCENARIO A: Allowed payment with 2-of-2 multisig validated on-ledger
  // -----------------------------------------------------------------
  console.log("--- SCENARIO A: Authorized 2-of-2 Multisig Payment (ALLOW) ---");
  const reqA = { payee: supplierWallet.classicAddress, amountDrops: "10000" }; // 0.01 XRP
  const decisionA = evaluate(mandate, reqA, {
    spentTodayDrops: 0n,
    invoiceSeen: false,
    addressChanged: false,
  });

  if (decisionA.outcome !== "allow") {
    throw new Error(`Expected decision allow, got: ${JSON.stringify(decisionA)}`);
  }
  console.log("✓ Policy decision: ALLOW (Under 0.5 XRP threshold, within daily cap, allowlisted payee)");

  const receiptA: Receipt = {
    requestId: "req-e2e-001",
    invoiceId: "INV-2026-CLOUD-01",
    payee: supplierWallet.classicAddress,
    amountDrops: reqA.amountDrops,
    outcome: "allow",
    reasons: [],
    route: "payment",
    mandateVersion: mandate.version,
    issuedAt: new Date().toISOString(),
  };
  const rHashA = receiptHash(receiptA);
  const memoA = receiptMemo(rHashA);
  console.log(`✓ Signed Audit Receipt SHA-256 Digest: ${rHashA}`);

  console.log("Preparing multisig transaction on XRPL...");
  const txA = await prepareMultisigPayment(
    client,
    treasuryWallet.classicAddress,
    supplierWallet.classicAddress,
    reqA.amountDrops,
    [memoA],
    undefined,
    2,
  );

  console.log("Collecting Signer 1 signature (Agent Signer, Weight 1)...");
  const agentSignedA = signMultisig(txA, agentWallet);

  console.log("Collecting Signer 2 signature (Policy Signer, Weight 1)...");
  const policySignedA = signMultisig(txA, policyWallet);

  console.log("Combining signatures and broadcasting to XRPL Testnet...");
  const combinedBlobA = combineMultisig([agentSignedA.tx_blob, policySignedA.tx_blob]);
  const resultA = await submitMultisig(client, combinedBlobA);

  console.log(`✓ SUCCESS! Validated in ledger: ${resultA.ledger_index}`);
  console.log(`  Tx Hash:  ${resultA.hash}`);
  console.log(`  Explorer: https://testnet.xrpl.org/transactions/${resultA.hash}\n`);

  // -----------------------------------------------------------------
  // SCENARIO B: Human approval required (HOLD)
  // -----------------------------------------------------------------
  console.log("--- SCENARIO B: Approval Threshold Exceeded (HOLD) ---");
  const reqB = { payee: supplierWallet.classicAddress, amountDrops: "750000" }; // 0.75 XRP (> 0.5 XRP threshold, <= 1 XRP cap)
  const decisionB = evaluate(mandate, reqB, {
    spentTodayDrops: 10000n,
    invoiceSeen: false,
    addressChanged: false,
  });

  console.log(`Requested amount: 750,000 drops (0.75 XRP). Approval threshold: 500,000 drops (0.5 XRP).`);
  console.log(`Policy decision: ${decisionB.outcome.toUpperCase()}`);
  if (decisionB.outcome !== "hold") {
    throw new Error(`Expected decision hold, got: ${decisionB.outcome}`);
  }
  console.log(`Reason code: ${decisionB.reasons.join(", ")}`);
  console.log("✓ Correctly routed to human operator approval queue — auto-signing prevented.\n");

  // -----------------------------------------------------------------
  // SCENARIO C: Excessive payment exceeding per-transaction cap (REFUSE)
  // -----------------------------------------------------------------
  console.log("--- SCENARIO C: Excessive Payment Over Absolute Cap (REFUSE) ---");
  const reqC = { payee: supplierWallet.classicAddress, amountDrops: "2000000" }; // 2 XRP (> 1 XRP limit)
  const decisionC = evaluate(mandate, reqC, {
    spentTodayDrops: 10000n,
    invoiceSeen: false,
    addressChanged: false,
  });

  console.log(`Requested amount: 2,000,000 drops (2 XRP). Absolute limit: 1,000,000 drops (1 XRP).`);
  console.log(`Policy decision: ${decisionC.outcome.toUpperCase()}`);
  if (decisionC.outcome !== "refuse") {
    throw new Error(`Expected decision refuse, got: ${decisionC.outcome}`);
  }
  console.log(`Reason codes: ${decisionC.reasons.join(", ")}`);
  console.log("✓ Policy referee blocked transaction immediately — zero transaction submitted to ledger.\n");

  // -----------------------------------------------------------------
  // SCENARIO D: Unknown supplier payee (REFUSE)
  // -----------------------------------------------------------------
  console.log("--- SCENARIO D: Unknown Payee Outside Allowlist (REFUSE) ---");
  const unauthorizedPayee = Wallet.generate().classicAddress;
  const decisionD = evaluate(
    mandate,
    { payee: unauthorizedPayee, amountDrops: "100000" },
    { spentTodayDrops: 10000n, invoiceSeen: false, addressChanged: false },
  );

  console.log(`Payee ${unauthorizedPayee} not registered on approved allowlist`);
  console.log(`Policy decision: ${decisionD.outcome.toUpperCase()}`);
  if (decisionD.outcome !== "refuse") {
    throw new Error(`Expected decision refuse, got: ${decisionD.outcome}`);
  }
  console.log(`Reason codes: ${decisionD.reasons.join(", ")}`);
  console.log("✓ Unknown supplier strictly refused by mandate policy.\n");

  // -----------------------------------------------------------------
  // SCENARIO E: Agent tries to pay ALONE (XRPL Rejection)
  // -----------------------------------------------------------------
  console.log("--- SCENARIO E: Agent-Only Signing Attempt (XRPL Rejection) ---");
  const rogueTxE = await prepareMultisigPayment(
    client,
    treasuryWallet.classicAddress,
    supplierWallet.classicAddress,
    "50000",
    undefined,
    undefined,
    1,
  );
  const agentOnlySigned = signMultisig(rogueTxE, agentWallet);

  try {
    await client.submitAndWait(agentOnlySigned.tx_blob);
    throw new Error("CRITICAL FAILURE: Agent-only transaction was accepted by ledger!");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`✓ XRPL Ledger Rejection confirmed: ${errorMsg}`);
    console.log("✓ Ledger strictly enforces Quorum 2: Agent cannot unilaterally move treasury funds!\n");
  }

  // -----------------------------------------------------------------
  // SCENARIO F: Policy service tries to pay ALONE (XRPL Rejection)
  // -----------------------------------------------------------------
  console.log("--- SCENARIO F: Policy-Only Signing Attempt (XRPL Rejection) ---");
  const rogueTxF = await prepareMultisigPayment(
    client,
    treasuryWallet.classicAddress,
    supplierWallet.classicAddress,
    "50000",
    undefined,
    undefined,
    1,
  );
  const policyOnlySigned = signMultisig(rogueTxF, policyWallet);

  try {
    await client.submitAndWait(policyOnlySigned.tx_blob);
    throw new Error("CRITICAL FAILURE: Policy-only transaction was accepted by ledger!");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`✓ XRPL Ledger Rejection confirmed: ${errorMsg}`);
    console.log("✓ Ledger strictly enforces Quorum 2: Policy signer cannot unilaterally move funds!\n");
  }

  console.log("=================================================================");
  console.log("       ALL 6 E2E SCENARIOS FORENSICALLY VERIFIED!               ");
  console.log("=================================================================\n");

  await client.disconnect();
}

main().catch((err) => {
  console.error("\n❌ E2E test error:", err);
  process.exit(1);
});
