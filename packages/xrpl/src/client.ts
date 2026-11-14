import { Client, type SubmittableTransaction, type TxResponse, type Wallet } from "xrpl";

/** Connect to an XRPL node. The URL defaults to XRPL_URL. Retries on transient network/DNS errors. */
export async function connect(url = process.env.XRPL_URL, maxRetries = 3): Promise<Client> {
  if (!url) throw new Error("XRPL_URL is not set");

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new Client(url, { connectionTimeout: 20000 });
      await client.connect();
      return client;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  throw lastError;
}

/** XRPL returns `tesSUCCESS` in meta for a validated success. */
export function transactionResultCode(result: { meta?: unknown }): string | undefined {
  const meta = result.meta;
  if (typeof meta !== "object" || meta === null) return undefined;

  const code = (meta as { TransactionResult?: unknown }).TransactionResult;
  return typeof code === "string" ? code : undefined;
}

export function assertValidatedSuccess<T extends { hash: string; meta?: unknown }>(result: T): T {
  const code = transactionResultCode(result);
  if (code !== "tesSUCCESS") {
    throw new Error(`XRPL ${code ?? "unknown"}: ${result.hash}`);
  }
  return result;
}

/**
 * Submit and wait for validation. Never report a payment as done on a
 * submitted-but-unvalidated or failed transaction.
 */
export async function submitValidated<T extends SubmittableTransaction>(
  client: Client,
  tx: T,
  wallet: Wallet,
): Promise<TxResponse<T>["result"]> {
  const response = await client.submitAndWait(tx, { autofill: true, wallet });
  return assertValidatedSuccess(response.result);
}

/** Fund a fresh Testnet wallet from the faucet. */
export async function fundNew(client: Client): Promise<Wallet> {
  const { wallet } = await client.fundWallet();
  return wallet;
}
