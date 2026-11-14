import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Wallet, configureSignerList, getSignerList } from "@kitro/xrpl";

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

const isFreshRequested = process.argv.includes("--fresh") || process.argv.includes("--force-fresh");

function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(path)) return env;

  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

async function fundWalletSafe(client: Client, label: string): Promise<Wallet> {
  process.stdout.write(`Funding ${label} from official XRPL Testnet faucet... `);
  try {
    const { wallet, balance } = await client.fundWallet(null, {
      faucetHost: "faucet.altnet.rippletest.net",
    });
    console.log(`✓ Funded! Balance: ${balance} XRP (${wallet.classicAddress})`);
    return wallet;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`✗ Faucet error: ${errorMsg}`);
    console.log(`\nManual recovery: please generate and fund a wallet at:`);
    console.log(`  https://testnet.xrpl.org/resources/faucet`);
    throw err;
  }
}

async function getBalanceSafe(client: Client, address: string): Promise<{ balance: string; exists: boolean }> {
  try {
    const balance = await client.getXrpBalance(address);
    return { balance: `${balance} XRP`, exists: true };
  } catch {
    return { balance: "0 XRP (Unactivated)", exists: false };
  }
}

async function main() {
  console.log("===============================================================");
  console.log("             KITRO XRPL TESTNET SETUP & AUDIT                  ");
  console.log("===============================================================");
  console.log(`Target Network: ${TESTNET_URL}`);
  console.log(`Execution Mode: ${isFreshRequested ? "FRESH WALLET GENERATION (--fresh)" : "EXISTING / IDEMPOTENT"}`);

  const client = new Client(TESTNET_URL, { connectionTimeout: 20000 });
  await client.connect();
  console.log("✓ Connected to XRPL Testnet\n");

  let existingEnv: Record<string, string> = {};
  if (isFreshRequested && existsSync(ENV_PATH)) {
    const backupPath = `${ENV_PATH}.backup-${Date.now()}`;
    copyFileSync(ENV_PATH, backupPath);
    console.log(`[BACKUP] Existing .env.local archived to ${backupPath}`);
  } else {
    existingEnv = loadEnvFile(ENV_PATH);
  }

  let treasuryWallet: Wallet;
  let agentWallet: Wallet;
  let policyWallet: Wallet;
  let supplierWallet: Wallet;

  // 1. Treasury / Operator wallet
  const treasurySeed = !isFreshRequested ? (process.env.TREASURY_SEED || existingEnv.TREASURY_SEED) : undefined;
  if (treasurySeed) {
    treasuryWallet = Wallet.fromSeed(treasurySeed);
    console.log(`✓ Loaded configured Treasury wallet: ${treasuryWallet.classicAddress}`);
  } else {
    treasuryWallet = await fundWalletSafe(client, "Treasury (Operator)");
  }

  // 2. Agent wallet (Signer 1)
  const agentSeed = !isFreshRequested ? (process.env.AGENT_SEED || existingEnv.AGENT_SEED) : undefined;
  if (agentSeed) {
    agentWallet = Wallet.fromSeed(agentSeed);
    console.log(`✓ Loaded configured Agent signer:    ${agentWallet.classicAddress}`);
  } else {
    agentWallet = await fundWalletSafe(client, "Agent Signer");
  }

  // 3. Policy wallet (Signer 2)
  const policySeed = !isFreshRequested ? (process.env.POLICY_SEED || existingEnv.POLICY_SEED) : undefined;
  if (policySeed) {
    policyWallet = Wallet.fromSeed(policySeed);
    console.log(`✓ Loaded configured Policy signer:   ${policyWallet.classicAddress}`);
  } else {
    policyWallet = await fundWalletSafe(client, "Policy Signer");
  }

  // 4. Supplier wallet
  const supplierSeed = !isFreshRequested ? (process.env.SUPPLIER_SEED || existingEnv.SUPPLIER_SEED) : undefined;
  if (supplierSeed) {
    supplierWallet = Wallet.fromSeed(supplierSeed);
    console.log(`✓ Loaded configured Supplier:        ${supplierWallet.classicAddress}`);
  } else {
    supplierWallet = await fundWalletSafe(client, "Test Supplier");
  }

  // Account existence and balance verification
  console.log("\nAccount Verification & Ledger State:");
  const treasuryState = await getBalanceSafe(client, treasuryWallet.classicAddress);
  const agentState = await getBalanceSafe(client, agentWallet.classicAddress);
  const policyState = await getBalanceSafe(client, policyWallet.classicAddress);
  const supplierState = await getBalanceSafe(client, supplierWallet.classicAddress);

  console.log(`  Treasury (${treasuryWallet.classicAddress}): ${treasuryState.balance} [Exists: ${treasuryState.exists}]`);
  console.log(`  Agent    (${agentWallet.classicAddress}): ${agentState.balance} [Exists: ${agentState.exists}]`);
  console.log(`  Policy   (${policyWallet.classicAddress}): ${policyState.balance} [Exists: ${policyState.exists}]`);
  console.log(`  Supplier (${supplierWallet.classicAddress}): ${supplierState.balance} [Exists: ${supplierState.exists}]`);

  if (!treasuryState.exists || !agentState.exists || !policyState.exists) {
    throw new Error("One or more required accounts are unactivated on the XRPL Testnet ledger.");
  }

  // Persist to .env.local without logging seeds to console
  const envFileLines: string[] = [
    `# Kitro Canonical Environment Configuration`,
    `# Generated by setup-testnet at ${new Date().toISOString()}`,
    `XRPL_URL=${TESTNET_URL}`,
    `TREASURY_ADDRESS=${treasuryWallet.classicAddress}`,
    `OPERATOR_ADDRESS=${treasuryWallet.classicAddress}`,
    `AGENT_ADDRESS=${agentWallet.classicAddress}`,
    `POLICY_ADDRESS=${policyWallet.classicAddress}`,
    `SUPPLIER_ADDRESS=${supplierWallet.classicAddress}`,
    `TREASURY_SEED=${treasuryWallet.seed}`,
    `AGENT_SEED=${agentWallet.seed}`,
    `POLICY_SEED=${policyWallet.seed}`,
    `SUPPLIER_SEED=${supplierWallet.seed}`,
    `PORT=3000`,
    `POLICY_SERVICE_PORT=8787`,
    `MCP_PORT=3001`,
    `KITRO_API_URL=http://localhost:8787`,
  ];

  writeFileSync(ENV_PATH, envFileLines.join("\n") + "\n", "utf-8");
  console.log(`\n✓ Securely saved configuration to ${ENV_PATH} (Seeds preserved, gitignored, never printed to console)`);

  // Section 2.2: SignerList verification logic
  console.log("\n--- SignerListSet Verification ---");
  const onLedgerSignerList = await getSignerList(client, treasuryWallet.classicAddress);

  let isSignerListMatching = false;
  if (onLedgerSignerList) {
    const hasAgent = onLedgerSignerList.signers.some(
      (s) => s.address === agentWallet.classicAddress && s.weight === 1,
    );
    const hasPolicy = onLedgerSignerList.signers.some(
      (s) => s.address === policyWallet.classicAddress && s.weight === 1,
    );
    const hasExactQuorum = onLedgerSignerList.quorum === 2;
    const hasExactTwoSigners = onLedgerSignerList.signers.length === 2;

    if (hasAgent && hasPolicy && hasExactQuorum && hasExactTwoSigners) {
      isSignerListMatching = true;
    }
  }

  if (isSignerListMatching && onLedgerSignerList) {
    console.log(`[STAGE 4: INDEPENDENTLY VERIFIED]`);
    console.log(`✓ On-ledger SignerList already matches expected 2-of-2 multisig configuration:`);
    console.log(`  - Required Quorum: ${onLedgerSignerList.quorum}`);
    console.log(`  - Signer 1 (Agent):  ${agentWallet.classicAddress} (Weight 1)`);
    console.log(`  - Signer 2 (Policy): ${policyWallet.classicAddress} (Weight 1)`);
  } else {
    if (onLedgerSignerList) {
      console.log(`[MISMATCH DETECTED] On-ledger signer list does not match configured agent/policy wallets.`);
      console.log(`Current signers on ledger:`, onLedgerSignerList.signers);
      console.log(`Applying corrective SignerListSet transaction...`);
    } else {
      console.log(`No SignerList found on Treasury account. Configuring 2-of-2 multisig...`);
    }

    // Stage 1: Setup attempted
    console.log(`[STAGE 1: SETUP ATTEMPTED] Preparing SignerListSet transaction for Treasury ${treasuryWallet.classicAddress}`);
    console.log(`  Target Quorum: 2`);
    console.log(`  Target Signer 1 (Agent):  ${agentWallet.classicAddress} (Weight 1)`);
    console.log(`  Target Signer 2 (Policy): ${policyWallet.classicAddress} (Weight 1)`);

    // Stage 2: Setup transaction submitted
    console.log(`[STAGE 2: SETUP TX SUBMITTED] Broadcasting to XRPL Testnet...`);
    const txResult = await configureSignerList(
      client,
      treasuryWallet,
      [
        { address: agentWallet.classicAddress, weight: 1 },
        { address: policyWallet.classicAddress, weight: 1 },
      ],
      2,
    );

    // Stage 3: Setup transaction validated
    console.log(`[STAGE 3: SETUP TX VALIDATED]`);
    console.log(`  Transaction Hash: ${txResult.hash}`);
    console.log(`  Ledger Index:     ${txResult.ledger_index}`);
    const meta = txResult.meta as Record<string, unknown> | undefined;
    const resultCode = (meta?.TransactionResult as string) || "tesSUCCESS";
    console.log(`  Result Code:      ${resultCode}`);

    // Stage 4: Independent ledger query verification
    console.log(`[STAGE 4: INDEPENDENTLY VERIFYING ON LEDGER] Querying account_objects...`);
    const verifiedSignerList = await getSignerList(client, treasuryWallet.classicAddress);

    if (!verifiedSignerList) {
      throw new Error("Post-configuration verification failed: SignerList object not found on ledger.");
    }
    if (verifiedSignerList.quorum !== 2) {
      throw new Error(`Post-configuration verification failed: Quorum is ${verifiedSignerList.quorum}, expected 2.`);
    }

    const verifiedAgent = verifiedSignerList.signers.find((s) => s.address === agentWallet.classicAddress);
    const verifiedPolicy = verifiedSignerList.signers.find((s) => s.address === policyWallet.classicAddress);

    if (!verifiedAgent || verifiedAgent.weight !== 1) {
      throw new Error("Post-configuration verification failed: Agent signer weight mismatch.");
    }
    if (!verifiedPolicy || verifiedPolicy.weight !== 1) {
      throw new Error("Post-configuration verification failed: Policy signer weight mismatch.");
    }

    console.log(`✓ Independent verification complete: SignerList verified on ledger with Quorum 2 and exact weights.`);
  }

  console.log("\n===============================================================");
  console.log("             SECURITY GOVERNANCE & STATUS                      ");
  console.log("===============================================================");
  console.log("Security Statement:");
  console.log(
    '"Routine agent-initiated payments require both the agent signer and independent policy signer. The treasury operator retains a separate master-key recovery capability in the current Testnet configuration."',
  );
  console.log("===============================================================\n");

  await client.disconnect();
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err);
  process.exit(1);
});
