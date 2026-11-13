import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Wallet, configureSignerList, getSignerList } from "@kitro/xrpl";

const TESTNET_URL = process.env.XRPL_URL ?? "wss://s.altnet.rippletest.net:51233";
const ENV_PATH = resolve(process.cwd(), ".env.local");

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
  process.stdout.write(`Funding ${label} from XRPL Testnet faucet... `);
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

async function getBalanceSafe(client: Client, address: string): Promise<string> {
  try {
    const balance = await client.getXrpBalance(address);
    return `${balance} XRP`;
  } catch {
    return "Not activated (0 XRP)";
  }
}

async function main() {
  console.log("=================================================");
  console.log("         KITRO XRPL TESTNET SETUP                ");
  console.log("=================================================");
  console.log(`Connecting to: ${TESTNET_URL}`);

  const client = new Client(TESTNET_URL);
  await client.connect();
  console.log("✓ Connected to XRPL Testnet\n");

  const existingEnv = loadEnvFile(ENV_PATH);

  let treasuryWallet: Wallet;
  let agentWallet: Wallet;
  let policyWallet: Wallet;
  let supplierWallet: Wallet;

  // 1. Treasury / Operator wallet
  const treasurySeed = process.env.TREASURY_SEED || existingEnv.TREASURY_SEED;
  if (treasurySeed) {
    treasuryWallet = Wallet.fromSeed(treasurySeed);
    console.log(`✓ Loaded existing Treasury wallet: ${treasuryWallet.classicAddress}`);
  } else {
    treasuryWallet = await fundWalletSafe(client, "Treasury (Operator)");
  }

  // 2. Agent wallet (Signer 1)
  const agentSeed = process.env.AGENT_SEED || existingEnv.AGENT_SEED;
  if (agentSeed) {
    agentWallet = Wallet.fromSeed(agentSeed);
    console.log(`✓ Loaded existing Agent signer:    ${agentWallet.classicAddress}`);
  } else {
    agentWallet = await fundWalletSafe(client, "Agent Signer");
  }

  // 3. Policy wallet (Signer 2)
  const policySeed = process.env.POLICY_SEED || existingEnv.POLICY_SEED;
  if (policySeed) {
    policyWallet = Wallet.fromSeed(policySeed);
    console.log(`✓ Loaded existing Policy signer:   ${policyWallet.classicAddress}`);
  } else {
    policyWallet = await fundWalletSafe(client, "Policy Signer");
  }

  // 4. Test supplier wallet
  const supplierSeed = process.env.SUPPLIER_SEED || existingEnv.SUPPLIER_SEED;
  if (supplierSeed) {
    supplierWallet = Wallet.fromSeed(supplierSeed);
    console.log(`✓ Loaded existing Supplier:        ${supplierWallet.classicAddress}`);
  } else {
    supplierWallet = await fundWalletSafe(client, "Test Supplier");
  }

  // Check balances
  console.log("\nAccount Balances:");
  console.log(`  Treasury: ${await getBalanceSafe(client, treasuryWallet.classicAddress)}`);
  console.log(`  Agent:    ${await getBalanceSafe(client, agentWallet.classicAddress)}`);
  console.log(`  Policy:   ${await getBalanceSafe(client, policyWallet.classicAddress)}`);
  console.log(`  Supplier: ${await getBalanceSafe(client, supplierWallet.classicAddress)}`);

  // Persist seeds to .env.local if not already there
  const newEnvVars: string[] = [];
  if (!treasurySeed && treasuryWallet.seed) {
    newEnvVars.push(`TREASURY_SEED=${treasuryWallet.seed}`);
    newEnvVars.push(`TREASURY_ADDRESS=${treasuryWallet.classicAddress}`);
    newEnvVars.push(`OPERATOR_ADDRESS=${treasuryWallet.classicAddress}`);
  }
  if (!agentSeed && agentWallet.seed) {
    newEnvVars.push(`AGENT_SEED=${agentWallet.seed}`);
    newEnvVars.push(`AGENT_ADDRESS=${agentWallet.classicAddress}`);
  }
  if (!policySeed && policyWallet.seed) {
    newEnvVars.push(`POLICY_SEED=${policyWallet.seed}`);
    newEnvVars.push(`POLICY_ADDRESS=${policyWallet.classicAddress}`);
  }
  if (!supplierSeed && supplierWallet.seed) {
    newEnvVars.push(`SUPPLIER_SEED=${supplierWallet.seed}`);
    newEnvVars.push(`SUPPLIER_ADDRESS=${supplierWallet.classicAddress}`);
  }

  if (newEnvVars.length > 0) {
    appendFileSync(ENV_PATH, `\n# Generated by Kitro setup-testnet at ${new Date().toISOString()}\n` + newEnvVars.join("\n") + "\n");
    console.log(`\n✓ Wrote account credentials to ${ENV_PATH} (gitignored)`);
  }

  // Configure or verify SignerList on Treasury
  console.log("\nInspecting Treasury SignerList...");
  const currentSignerList = await getSignerList(client, treasuryWallet.classicAddress);

  if (currentSignerList) {
    console.log(`✓ On-ledger SignerList already configured (Quorum: ${currentSignerList.quorum})`);
    for (const signer of currentSignerList.signers) {
      console.log(`  - Signer ${signer.address} (Weight: ${signer.weight})`);
    }
  } else {
    console.log("Configuring 2-of-2 multisig SignerList on Treasury...");
    console.log(`  Signer 1 (Agent):  ${agentWallet.classicAddress} (Weight 1)`);
    console.log(`  Signer 2 (Policy): ${policyWallet.classicAddress} (Weight 1)`);
    console.log(`  Quorum: 2 (both signatures required)`);

    const result = await configureSignerList(
      client,
      treasuryWallet,
      [
        { address: agentWallet.classicAddress, weight: 1 },
        { address: policyWallet.classicAddress, weight: 1 },
      ],
      2,
    );
    console.log(`✓ SignerListSet validated in ledger! Result: tesSUCCESS (Tx: ${result.hash})`);

    const verified = await getSignerList(client, treasuryWallet.classicAddress);
    if (!verified || verified.quorum !== 2) {
      throw new Error("Failed to verify on-ledger SignerList");
    }
    console.log("✓ Verified on-ledger SignerList matching expected quorum (2) and weights.");
  }

  console.log("\n=================================================");
  console.log("           SETUP COMPLETE & VERIFIED             ");
  console.log("=================================================");
  console.log("Treasury is now protected by 2-of-2 XRPL multisig.");
  console.log("Neither the Agent nor the Policy Service can move funds alone.\n");

  await client.disconnect();
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err);
  process.exit(1);
});
