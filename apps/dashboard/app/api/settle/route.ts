import { NextResponse } from "next/server";
import { Client, Wallet } from "@kitro/xrpl";
import { prepareMultisigPayment, signMultisig, combineMultisig, submitMultisig } from "@kitro/xrpl/multisig";
import { getKitroConfig } from "@kitro/core";

export async function POST(request: Request) {
  let client: Client | null = null;
  try {
    const config = getKitroConfig([], process.env as Record<string, string | undefined>);
    const defaultWs = config.XRPL_URL;
    const treasuryAddress = config.TREASURY_ADDRESS || "rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk";
    const agentSeed = config.AGENT_SEED;
    const policySeed = config.POLICY_SEED;
    const defaultSupplier = config.SUPPLIER_ADDRESS || "rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze";

    if (!agentSeed || !policySeed) {
      return NextResponse.json(
        {
          success: false,
          error: "Signing seeds (AGENT_SEED, POLICY_SEED) are not configured in environment.",
        },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const destination = body.destination || defaultSupplier;
    const amountDrops = String(body.amountDrops || "10000"); // Default 0.01 XRP (safe testnet amount)
    const invoiceId = body.invoiceId || `INV-${Date.now()}`;
    const description = body.description || "Authorized autonomous settlement";

    client = new Client(defaultWs, { connectionTimeout: 20000 });
    await client.connect();

    const agentWallet = Wallet.fromSeed(agentSeed);
    const policyWallet = Wallet.fromSeed(policySeed);

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
      treasuryAddress,
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
