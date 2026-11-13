import { deriveAddress, deriveKeypair, generateSeed, sign } from "ripple-keypairs";
import { describe, expect, it } from "vitest";
import { verifyReceipt, signMandate, type Mandate } from "@kitro/core";
import { createPolicyApp } from "./app";
import { OperatorAuth } from "./operator-auth";
import { MemoryPolicyStore } from "./store";

function makeWallet() {
  const seed = generateSeed();
  const keypair = deriveKeypair(seed);
  return { seed, ...keypair, address: deriveAddress(keypair.publicKey) };
}

function makeMandate(operator: string): Mandate {
  return {
    version: 1,
    operator,
    network: "xrpl:1",
    treasury: "rTreasury",
    perPaymentMaxDrops: "5000000",
    dailyMaxDrops: "7000000",
    requireApprovalAboveDrops: "5000000",
    payees: [{ address: "rSupplier", name: "Supplier", route: "payment" }],
    newPayeeRoute: "refuse",
    escrowMaxLockSeconds: 86400,
    paused: false,
    issuedAt: "2026-11-13T00:00:00.000Z",
  };
}

async function authenticatedApp() {
  const operator = makeWallet();
  const policy = makeWallet();
  const auth = new OperatorAuth();
  const store = new MemoryPolicyStore();
  const app = createPolicyApp(store, {
    network: "xrpl:1",
    treasury: "rTreasury",
    operatorAddress: operator.address,
    policySeed: policy.seed,
    agentToken: "agent-token",
    operatorAuth: auth,
  });

  const challengeResponse = await app.request("/auth/challenge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: operator.address }),
  });
  const challenge = (await challengeResponse.json()) as { nonce: string };
  const verifyResponse = await app.request("/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      address: operator.address,
      nonce: challenge.nonce,
      publicKey: operator.publicKey,
      signature: sign(challenge.nonce, operator.privateKey),
    }),
  });
  const session = (await verifyResponse.json()) as { token: string };
  const mandate = makeMandate(operator.address);
  const mandateResponse = await app.request("/mandate", {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mandate,
      publicKey: operator.publicKey,
      signature: signMandate(mandate, operator.privateKey),
    }),
  });

  expect(mandateResponse.status).toBe(201);
  return { app, sessionToken: session.token };
}

function agentHeaders() {
  return {
    authorization: "Bearer agent-token",
    "content-type": "application/json",
  };
}

describe("policy routes", () => {
  it("requires a verified mandate before accepting payment requests", async () => {
    const app = createPolicyApp(new MemoryPolicyStore(), {
      network: "xrpl:1",
      treasury: "rTreasury",
      policySeed: generateSeed(),
      agentToken: "agent-token",
    });

    const response = await app.request("/requests", {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify({ invoiceId: "INV-1", payee: "rSupplier", amountDrops: "1" }),
    });

    expect(response.status).toBe(503);
  });

  it("evaluates, signs, and idempotently returns a payment decision", async () => {
    const { app } = await authenticatedApp();
    const body = { invoiceId: "INV-1", payee: "rSupplier", amountDrops: "2500000" };

    const first = await app.request("/requests", {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify(body),
    });
    const firstJson = (await first.json()) as {
      id: string;
      status: string;
      receipt: Parameters<typeof verifyReceipt>[0];
    };

    expect(first.status).toBe(201);
    expect(firstJson.status).toBe("approved");
    expect(verifyReceipt(firstJson.receipt)).toBe(true);

    const retry = await app.request("/requests", {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify(body),
    });
    expect(retry.status).toBe(200);
    expect((await retry.json()) as { id: string }).toHaveProperty("id", firstJson.id);
  });

  it("refuses a request that exceeds the per-payment cap", async () => {
    const { app } = await authenticatedApp();
    const response = await app.request("/requests", {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify({ invoiceId: "INV-2", payee: "rSupplier", amountDrops: "5000001" }),
    });
    const json = (await response.json()) as { status: string; decision: { reasons: string[] } };

    expect(response.status).toBe(201);
    expect(json.status).toBe("refused");
    expect(json.decision.reasons).toContain("OVER_PER_PAYMENT_CAP");
  });

  it("lets the operator pause and resume policy decisions", async () => {
    const { app, sessionToken } = await authenticatedApp();
    const operatorHeaders = {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
    };

    expect((await app.request("/pause", { method: "POST", headers: operatorHeaders })).status).toBe(
      200,
    );
    const paused = await app.request("/requests", {
      method: "POST",
      headers: agentHeaders(),
      body: JSON.stringify({ invoiceId: "INV-3", payee: "rSupplier", amountDrops: "1" }),
    });
    const pausedJson = (await paused.json()) as { decision: { reasons: string[] } };
    expect(pausedJson.decision.reasons).toContain("PAUSED");

    expect((await app.request("/resume", { method: "POST", headers: operatorHeaders })).status).toBe(
      200,
    );
  });
});
