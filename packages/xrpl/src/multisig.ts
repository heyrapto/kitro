import {
  type Client,
  type Memo,
  type Payment,
  type SignerListSet,
  type TxResponse,
  type Wallet,
  multisign,
} from "xrpl";
import { assertValidatedSuccess, submitValidated } from "./client";

export type ConfiguredSigner = {
  address: string;
  weight: number;
};

export type SignerListResult = {
  signers: ConfiguredSigner[];
  quorum: number;
};

/**
 * Configure the SignerList on a treasury account.
 * Quorum must be met by the weights of the signers.
 * The treasury account itself must not be in the signer entries.
 */
export async function configureSignerList(
  client: Client,
  treasuryWallet: Wallet,
  signers: ConfiguredSigner[],
  quorum: number,
): Promise<TxResponse<SignerListSet>["result"]> {
  if (quorum <= 0) {
    throw new Error("Signer quorum must be a positive integer");
  }

  // Prevent treasury account from being in its own signer list
  const hasTreasury = signers.some((s) => s.address === treasuryWallet.classicAddress);
  if (hasTreasury) {
    throw new Error("Treasury account cannot be in its own signer list");
  }

  const tx: SignerListSet = {
    TransactionType: "SignerListSet",
    Account: treasuryWallet.classicAddress,
    SignerQuorum: quorum,
    SignerEntries: signers.map((s) => ({
      SignerEntry: {
        Account: s.address,
        SignerWeight: s.weight,
      },
    })),
  };

  return submitValidated(client, tx, treasuryWallet);
}

/**
 * Read the on-ledger SignerList object for an account.
 */
export async function getSignerList(
  client: Client,
  treasuryAddress: string,
): Promise<SignerListResult | null> {
  const response = await client.request({
    command: "account_objects",
    account: treasuryAddress,
    type: "signer_list",
  });

  const signerListObj = response.result.account_objects.find(
    (obj) => obj.LedgerEntryType === "SignerList",
  ) as
    | {
        SignerQuorum: number;
        SignerEntries: Array<{ SignerEntry: { Account: string; SignerWeight: number } }>;
      }
    | undefined;

  if (!signerListObj) {
    return null;
  }

  return {
    quorum: signerListObj.SignerQuorum,
    signers: signerListObj.SignerEntries.map((e) => ({
      address: e.SignerEntry.Account,
      weight: e.SignerEntry.SignerWeight,
    })),
  };
}

/**
 * Prepare an unsigned multisig Payment transaction.
 * Autofills sequence, fee (scaled for signersCount), and sets SigningPubKey to "".
 */
export async function prepareMultisigPayment(
  client: Client,
  treasury: string,
  destination: string,
  amountDrops: string,
  memos?: Memo[],
  destinationTag?: number,
  signersCount = 2,
): Promise<Payment> {
  if (!/^[1-9]\d*$/.test(amountDrops)) {
    throw new Error("Amount must be a positive integer string of drops");
  }

  const tx: Payment = {
    TransactionType: "Payment",
    Account: treasury,
    Destination: destination,
    Amount: amountDrops,
    ...(memos && memos.length > 0 ? { Memos: memos } : {}),
    ...(destinationTag !== undefined ? { DestinationTag: destinationTag } : {}),
  };

  const autofilled = await client.autofill(tx, signersCount);
  autofilled.SigningPubKey = "";
  return autofilled;
}

/**
 * Sign a prepared transaction with one signer's wallet for multisigning.
 * Returns the signed tx_blob containing this signer's signature.
 */
export function signMultisig(
  tx: Payment,
  signerWallet: Wallet,
): { tx_blob: string; hash: string } {
  // Ensure SigningPubKey is empty and remove any prior signatures for multisigning
  const prepared = { ...tx, SigningPubKey: "" };
  delete (prepared as Record<string, unknown>).Signers;
  delete (prepared as Record<string, unknown>).TxnSignature;
  return signerWallet.sign(prepared, true);
}

/**
 * Combine multiple signed transaction blobs into a single multisigned tx_blob.
 */
export function combineMultisig(signedBlobs: Array<string | Payment>): string {
  return multisign(signedBlobs);
}

/**
 * Submit a combined multisigned transaction blob and wait for ledger validation.
 */
export async function submitMultisig(
  client: Client,
  combinedTxBlob: string,
): Promise<TxResponse<Payment>["result"]> {
  const response = await client.submitAndWait<Payment>(combinedTxBlob);
  return assertValidatedSuccess(response.result);
}
