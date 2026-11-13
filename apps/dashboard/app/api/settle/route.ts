import { NextResponse } from "next/server";
import { Client, Wallet } from "@kitro/xrpl";
import { prepareMultisigPayment, signMultisig, combineMultisig, submitMultisig } from "@kitro/xrpl/multisig";

const DEFAULT_WS = process.env.XRPL_RPC_URL || process.env.NEXT_PUBLIC_XRPL_WS || "wss://s.altnet.rippletest.net:51233";
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn";
const AGENT_SEED = process.env.AGENT_SEED || "sEdSzsNgvkwMxZ2gZo62KLuCYcE4XQn";
const POLICY_SEED = process.env.POLICY_SEED || "sEdV8Z9hGEJN9AgwLZRUqrRJi9AdZV4";
const DEFAULT_SUPPLIER = process.env.SUPPLIER_ADDRESS || process.env.NEXT_PUBLIC_SUPPLIER_ADDRESS || "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt";

export async function POST(request: Request) {
  let client: Client | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    const destination = body.destination || DEFAULT_SUPPLIER;
    const amountDrops = String(body.amountDrops || "1000000"); // Default 1 XRP
    const invoiceId = body.invoiceId || `INV-${Date.now()}`;
    const description = body.description || "Authorized autonomous settlement";

    client = new Client(DEFAULT_WS);
    await client.connect();

    const agentWallet = Wallet.fromSeed(AGENT_SEED);
    const policyWallet = Wallet.fromSeed(POLICY_SEED);

    // Prepare payment with 2 signers
    const memos = [
      {
        Memo: {
          MemoType: Buffer.from("kitro/settlement", "utf8").toString("hex").toUpperCase(),
          MemoData: Buffer.from(JSON.stringify({ invoiceId, desc: description }), "utf8").toString("hex").toUpperCase(),
        },
      },
    ];

    const prepared = await prepareMultisigPayment(
      client,
      TREASURY_ADDRESS,
      destination,
      amountDrops,
      memos,
      undefined,
      2,
    );

    // Both signers sign the exact same prepared transaction
    const agentSign = signMultisig(prepared, agentWallet);
    const policySign = signMultisig(prepared, policyWallet);

    // Combine 2-of-2 multisig
    const combinedBlob = combineMultisig([agentSign.tx_blob, policySign.tx_blob]);

    // Submit and wait for validated ledger entry
    const result = await submitMultisig(client, combinedBlob);

    await client.disconnect();

    return NextResponse.json({
      success: true,
      hash: result.hash,
      ledgerIndex: result.ledger_index,
      resultCode: (result.meta as any)?.TransactionResult || "tesSUCCESS",
      explorerUrl: `https://testnet.xrpl.org/transactions/${result.hash}`,
      amountDrops,
      amountXrp: (Number(amountDrops) / 1000000).toFixed(6),
      destination,
      signers: [
        { address: agentWallet.classicAddress, role: "Agent Signer", weight: 1 },
        { address: policyWallet.classicAddress, role: "Policy Signer", weight: 1 },
      ],
      quorumMet: "2-of-2",
      invoiceId,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (client && client.isConnected()) {
      await client.disconnect().catch(() => {});
    }

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "XRPL multisig settlement failed",
        details: err?.data || null,
      },
      { status: 400 },
    );
  }
}
