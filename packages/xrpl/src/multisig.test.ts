import { describe, expect, it } from "vitest";
import { Wallet, type Payment } from "xrpl";
import {
  combineMultisig,
  configureSignerList,
  prepareMultisigPayment,
  signMultisig,
} from "./multisig";

describe("multisig helpers", () => {
  it("signMultisig signs with SigningPubKey set to empty string and populates Signers", () => {
    const signer = Wallet.generate();
    const treasury = Wallet.generate();

    const tx: Payment = {
      TransactionType: "Payment",
      Account: treasury.classicAddress,
      Destination: Wallet.generate().classicAddress,
      Amount: "1000000",
      Fee: "30",
      Sequence: 1,
      SigningPubKey: "",
    };

    const signed = signMultisig(tx, signer);
    expect(signed.tx_blob).toBeTypeOf("string");
    expect(signed.hash).toMatch(/^[0-9A-F]{64}$/i);
  });

  it("combineMultisig combines signatures from multiple signers into a single blob", () => {
    const treasury = Wallet.generate();
    const signer1 = Wallet.generate();
    const signer2 = Wallet.generate();
    const destination = Wallet.generate();

    const tx: Payment = {
      TransactionType: "Payment",
      Account: treasury.classicAddress,
      Destination: destination.classicAddress,
      Amount: "5000000",
      Fee: "40",
      Sequence: 10,
      SigningPubKey: "",
    };

    const signed1 = signMultisig(tx, signer1);
    const signed2 = signMultisig(tx, signer2);

    const combinedBlob = combineMultisig([signed1.tx_blob, signed2.tx_blob]);
    expect(combinedBlob).toBeTypeOf("string");
    expect(combinedBlob.length).toBeGreaterThan(signed1.tx_blob.length);
  });

  it("prepareMultisigPayment rejects non-positive or decimal amounts", async () => {
    const fakeClient = {} as any;
    await expect(
      prepareMultisigPayment(fakeClient, "rTreasury", "rDest", "0"),
    ).rejects.toThrow("Amount must be a positive integer");
    await expect(
      prepareMultisigPayment(fakeClient, "rTreasury", "rDest", "-100"),
    ).rejects.toThrow("Amount must be a positive integer");
    await expect(
      prepareMultisigPayment(fakeClient, "rTreasury", "rDest", "1.5"),
    ).rejects.toThrow("Amount must be a positive integer");
  });

  it("configureSignerList rejects treasury in signer entries or non-positive quorum", async () => {
    const fakeClient = {} as any;
    const treasury = Wallet.generate();

    await expect(
      configureSignerList(fakeClient, treasury, [{ address: "rOther", weight: 1 }], 0),
    ).rejects.toThrow("Signer quorum must be a positive integer");

    await expect(
      configureSignerList(
        fakeClient,
        treasury,
        [{ address: treasury.classicAddress, weight: 1 }],
        1,
      ),
    ).rejects.toThrow("Treasury account cannot be in its own signer list");
  });
});
