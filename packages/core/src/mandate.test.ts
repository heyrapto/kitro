import { deriveAddress, deriveKeypair, generateSeed } from "ripple-keypairs";
import { describe, expect, it } from "vitest";
import {
  Mandate,
  MandateEnvelope,
  mandateHash,
  signMandate,
  verifyMandate,
  type Mandate as MandateType,
} from "./mandate";

function makeKeypair() {
  const seed = generateSeed();
  const { privateKey, publicKey } = deriveKeypair(seed);
  return { privateKey, publicKey, address: deriveAddress(publicKey) };
}

function makeMandate(operator: string, overrides: Partial<MandateType> = {}): MandateType {
  return {
    version: 1,
    operator,
    network: "xrpl:1",
    treasury: "rTreasuryAddress",
    perPaymentMaxDrops: "5000000",
    dailyMaxDrops: "20000000",
    requireApprovalAboveDrops: "10000000",
    payees: [{ address: "rSupplierAddress", name: "Supplier A", route: "channel", tag: 12 }],
    newPayeeRoute: "escrow",
    escrowMaxLockSeconds: 86400,
    paused: false,
    issuedAt: "2026-11-12T10:00:00Z",
    ...overrides,
  };
}

describe("mandateHash", () => {
  it("hashes the same values to the same digest regardless of key order", () => {
    const { address } = makeKeypair();
    const mandate = makeMandate(address);
    const reordered: MandateType = {
      issuedAt: mandate.issuedAt,
      paused: mandate.paused,
      escrowMaxLockSeconds: mandate.escrowMaxLockSeconds,
      newPayeeRoute: mandate.newPayeeRoute,
      payees: mandate.payees,
      requireApprovalAboveDrops: mandate.requireApprovalAboveDrops,
      dailyMaxDrops: mandate.dailyMaxDrops,
      perPaymentMaxDrops: mandate.perPaymentMaxDrops,
      treasury: mandate.treasury,
      network: mandate.network,
      operator: mandate.operator,
      version: mandate.version,
    };

    expect(mandateHash(reordered)).toBe(mandateHash(mandate));
    expect(mandateHash(mandate)).toMatch(/^[0-9A-F]{64}$/);
  });

  it("changes when a limit changes", () => {
    const { address } = makeKeypair();
    const mandate = makeMandate(address);

    expect(mandateHash({ ...mandate, perPaymentMaxDrops: "5000001" })).not.toBe(
      mandateHash(mandate),
    );
  });
});

describe("signMandate and verifyMandate", () => {
  it("verifies an envelope signed by the operator", () => {
    const { privateKey, publicKey, address } = makeKeypair();
    const mandate = makeMandate(address);
    const envelope = {
      mandate,
      publicKey,
      signature: signMandate(mandate, privateKey),
    };

    expect(verifyMandate(envelope)).toBe(true);
    expect(MandateEnvelope.parse(envelope).mandate.version).toBe(1);
  });

  it("rejects a mandate changed after signing", () => {
    const { privateKey, publicKey, address } = makeKeypair();
    const mandate = makeMandate(address);
    const envelope = {
      mandate: { ...mandate, dailyMaxDrops: "99999999" },
      publicKey,
      signature: signMandate(mandate, privateKey),
    };

    expect(verifyMandate(envelope)).toBe(false);
  });

  it("rejects a signer that is not the operator", () => {
    const operator = makeKeypair();
    const attacker = makeKeypair();
    const mandate = makeMandate(operator.address);
    const envelope = {
      mandate,
      publicKey: attacker.publicKey,
      signature: signMandate(mandate, attacker.privateKey),
    };

    expect(verifyMandate(envelope)).toBe(false);
  });

  it("rejects malformed envelopes and bad signatures", () => {
    const { publicKey, address } = makeKeypair();
    const mandate = makeMandate(address);

    expect(verifyMandate({ mandate, publicKey })).toBe(false);
    expect(verifyMandate({ mandate, publicKey, signature: "00" })).toBe(false);
    expect(verifyMandate(null)).toBe(false);
  });
});

describe("Mandate schema", () => {
  it("rejects non-integer and decimal drop amounts", () => {
    const { address } = makeKeypair();

    expect(() => Mandate.parse(makeMandate(address, { perPaymentMaxDrops: "1.5" }))).toThrow();
    expect(() => Mandate.parse(makeMandate(address, { dailyMaxDrops: "-1" }))).toThrow();
    expect(() => Mandate.parse(makeMandate(address, { version: 0 }))).toThrow();
  });

  it("rejects unknown payee routes", () => {
    const { address } = makeKeypair();

    expect(() =>
      Mandate.parse(
        makeMandate(address, {
          payees: [{ address: "rSupplierAddress", name: "Supplier A", route: "escrow" } as never],
        }),
      ),
    ).toThrow();
  });
});
