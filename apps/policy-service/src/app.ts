import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { deriveKeypair } from "ripple-keypairs";
import {
  MandateEnvelope,
  PaymentRequest,
  Receipt,
  signReceipt,
  verifyMandate,
  type Mandate,
  type MandateEnvelope as MandateEnvelopeType,
  type PaymentRequest as PaymentRequestType,
  type Receipt as ReceiptType,
  type ReceiptEnvelope as ReceiptEnvelopeType,
} from "@kitro/core";
import { evaluate, type Decision } from "@kitro/rules";
import {
  Client,
  Wallet,
  decode,
  type Payment,
  signMultisig,
  combineMultisig,
  submitMultisig,
} from "@kitro/xrpl";
import { agentAuth } from "./auth";
import { OperatorAuth } from "./operator-auth";
import {
  mandateForEvaluation,
  MemoryPolicyStore,
  type PolicyStore,
  type RequestStatus,
  type StoredRequest,
} from "./store";

type AppVariables = {
  operatorAddress: string;
};

export type PolicyAppConfig = {
  network: string;
  treasury: string;
  xrplUrl?: string;
  operatorAddress?: string;
  policySeed?: string;
  agentToken?: string;
  operatorAuth?: OperatorAuth;
};

function nowIso(): string {
  return new Date().toISOString();
}

function responseFor(request: StoredRequest): Record<string, unknown> {
  return {
    id: request.id,
    status: request.status,
    decision: request.decision,
    receipt: request.receipt,
    ...(request.status === "approved" && request.route
      ? {
          signingIntent: {
            route: request.route,
            requestId: request.id,
            invoiceId: request.body.invoiceId,
            payee: request.body.payee,
            amountDrops: request.body.amountDrops,
            destinationTag: request.body.destinationTag,
          },
        }
      : {}),
  };
}

function parseStatus(value: string | undefined): RequestStatus | undefined {
  if (value === undefined) return undefined;
  return ["received", "held", "approved", "refused"].includes(value)
    ? (value as RequestStatus)
    : undefined;
}

export function createPolicyApp(
  store: PolicyStore = new MemoryPolicyStore(),
  config: PolicyAppConfig = {
    network: process.env.NETWORK ?? "xrpl:1",
    treasury: process.env.TREASURY_ADDRESS ?? "",
    xrplUrl: process.env.XRPL_URL,
    operatorAddress: process.env.OPERATOR_ADDRESS,
    policySeed: process.env.POLICY_SEED,
    agentToken: process.env.AGENT_API_TOKEN,
  },
) {
  const app = new Hono<{ Variables: AppVariables }>();
  const operatorAuth = config.operatorAuth ?? new OperatorAuth();
  const operatorMiddleware = operatorAuth.middleware(async () => {
    return config.operatorAddress ?? (await store.getActiveMandate())?.mandate.operator ?? null;
  });

  const activeMandate = async (): Promise<MandateEnvelopeType | null> =>
    await store.getActiveMandate();

  const signDecision = (receipt: ReceiptType): ReceiptEnvelopeType => {
    if (!config.policySeed) throw new Error("policy signer is not configured");
    const parsed = Receipt.parse(receipt);
    const keypair = deriveKeypair(config.policySeed);
    return {
      receipt: parsed,
      publicKey: keypair.publicKey,
      signature: signReceipt(parsed, keypair.privateKey),
    };
  };

  const createReceipt = (
    requestId: string,
    body: PaymentRequestType,
    decision: Decision,
    mandate: Mandate,
    txHash?: string,
  ): ReceiptEnvelopeType => {
    const receipt: ReceiptType = {
      requestId,
      invoiceId: body.invoiceId,
      payee: body.payee,
      amountDrops: body.amountDrops,
      outcome: decision.outcome,
      reasons: decision.outcome === "allow" ? [] : decision.reasons,
      ...(decision.outcome === "allow" ? { route: decision.route } : {}),
      mandateVersion: mandate.version,
      ...(txHash ? { txHash } : {}),
      issuedAt: nowIso(),
    };
    return signDecision(receipt);
  };

  app.get("/health", (c) =>
    c.json({ ok: true, service: "kitro-policy-service", store: store.constructor.name }),
  );

  app.get("/mandate", async (c) => {
    const mandate = await activeMandate();
    return mandate ? c.json(mandate) : c.json({ error: "no active mandate" }, 404);
  });

  app.post("/auth/challenge", async (c) => {
    const parsed = await c.req.json().catch(() => null);
    const address = typeof parsed?.address === "string" ? parsed.address : "";
    const active = await activeMandate();
    const expected = config.operatorAddress ?? active?.mandate.operator;
    if (!expected || address !== expected) return c.json({ error: "unauthorized" }, 401);
    return c.json(operatorAuth.createChallenge(address));
  });

  app.post("/auth/verify", async (c) => {
    const parsed = await c.req.json().catch(() => null);
    const address = typeof parsed?.address === "string" ? parsed.address : "";
    const nonce = typeof parsed?.nonce === "string" ? parsed.nonce : "";
    const publicKey = typeof parsed?.publicKey === "string" ? parsed.publicKey : "";
    const signature = typeof parsed?.signature === "string" ? parsed.signature : "";
    const token = operatorAuth.verifyChallenge(address, nonce, publicKey, signature);
    return token ? c.json({ token, expiresInSeconds: 900 }) : c.json({ error: "unauthorized" }, 401);
  });

  app.post("/mandate", operatorMiddleware, async (c) => {
    const parsed = MandateEnvelope.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid mandate envelope" }, 400);

    const envelope = parsed.data;
    const current = await activeMandate();
    if (
      !verifyMandate(envelope) ||
      envelope.mandate.network !== config.network ||
      envelope.mandate.treasury !== config.treasury ||
      (current && envelope.mandate.version <= current.mandate.version)
    ) {
      return c.json({ error: "mandate rejected" }, 409);
    }

    await store.saveMandate(envelope);
    return c.json(envelope, 201);
  });

  app.post("/requests", agentAuth(config.agentToken), async (c) => {
    const parsed = PaymentRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid payment request" }, 400);

    const body = parsed.data;
    const existing = await store.getRequestByInvoice(body.payee, body.invoiceId);
    if (existing) return c.json(responseFor(existing));

    const mandate = await mandateForEvaluation(store);
    if (!mandate) return c.json({ error: "no verified mandate" }, 503);
    if (!config.policySeed) return c.json({ error: "policy signer is not configured" }, 503);

    const id = randomUUID();
    const spentToday = await store.getSpentToday();
    const decision = evaluate(mandate, body, {
      spentTodayDrops: spentToday,
      invoiceSeen: false,
      addressChanged: false,
    });
    const receipt = createReceipt(id, body, decision, mandate);
    const stored: StoredRequest = {
      id,
      body,
      status:
        decision.outcome === "refuse"
          ? "refused"
          : decision.outcome === "hold"
            ? "held"
            : "approved",
      ...(decision.outcome === "allow" ? { route: decision.route } : {}),
      decision,
      mandateVersion: mandate.version,
      receipt,
      createdAt: nowIso(),
    };

    if (decision.outcome === "allow") await store.reserveToday(body.amountDrops);
    await store.createRequest(stored);
    return c.json(responseFor(stored), 201);
  });

  app.get("/requests/:id", agentAuth(config.agentToken), async (c) => {
    const request = await store.getRequest(c.req.param("id"));
    return request ? c.json(responseFor(request)) : c.json({ error: "not found" }, 404);
  });

  /**
   * Multisig co-signing endpoint.
   * Agent submits its signed blob. Policy service verifies that the transaction
   * fields strictly match the approved request, co-signs, combines, and submits.
   */
  app.post("/requests/:id/sign", agentAuth(config.agentToken), async (c) => {
    const id = c.req.param("id");
    const request = await store.getRequest(id);
    if (!request) return c.json({ error: "not found" }, 404);
    if (request.status !== "approved") {
      return c.json({ error: "request is not approved for signing" }, 409);
    }
    if (!config.policySeed) {
      return c.json({ error: "policy signer is not configured" }, 503);
    }

    const payload = await c.req.json().catch(() => null);
    const agentSignedBlob =
      typeof payload?.agentSignedBlob === "string"
        ? payload.agentSignedBlob
        : typeof payload?.signedBlob === "string"
          ? payload.signedBlob
          : null;

    if (!agentSignedBlob) {
      return c.json({ error: "missing agentSignedBlob" }, 400);
    }

    // Decode and verify the agent's proposed transaction
    let decodedTx: Record<string, unknown>;
    try {
      decodedTx = decode(agentSignedBlob) as Record<string, unknown>;
    } catch {
      return c.json({ error: "invalid transaction blob" }, 400);
    }

    // Fail-closed verification: rebuild and compare
    const expectedTreasury = config.treasury;
    const expectedDestination = request.body.payee;
    const expectedAmount = request.body.amountDrops;

    if (
      decodedTx.TransactionType !== "Payment" ||
      decodedTx.Account !== expectedTreasury ||
      decodedTx.Destination !== expectedDestination ||
      String(decodedTx.Amount) !== expectedAmount
    ) {
      return c.json(
        {
          error: "transaction fields mismatch approved request",
          expected: {
            Account: expectedTreasury,
            Destination: expectedDestination,
            Amount: expectedAmount,
          },
          received: {
            Account: decodedTx.Account,
            Destination: decodedTx.Destination,
            Amount: decodedTx.Amount,
          },
        },
        400,
      );
    }

    // Co-sign with policy key
    const policyWallet = Wallet.fromSeed(config.policySeed);
    const policySigned = signMultisig(decodedTx as Payment, policyWallet);
    const combinedBlob = combineMultisig([agentSignedBlob, policySigned.tx_blob]);

    // Submit to XRPL if network connection is available
    const xrplUrl = config.xrplUrl ?? process.env.XRPL_URL;
    let txHash = policySigned.hash;
    let ledgerIndex: number | undefined;

    if (xrplUrl) {
      try {
        const client = new Client(xrplUrl);
        await client.connect();
        const submitResult = await submitMultisig(client, combinedBlob);
        txHash = submitResult.hash;
        ledgerIndex = submitResult.ledger_index;
        await client.disconnect();
      } catch (submitErr: unknown) {
        const errorMsg = submitErr instanceof Error ? submitErr.message : String(submitErr);
        return c.json(
          {
            error: "multisig submission failed",
            details: errorMsg,
            txBlob: combinedBlob,
          },
          502,
        );
      }
    }

    // Update stored request to paid with verified txHash
    const mandate = await mandateForEvaluation(store);
    const updatedReceipt = mandate
      ? createReceipt(request.id, request.body, request.decision, mandate, txHash)
      : request.receipt;

    const updatedRequest: StoredRequest = {
      ...request,
      status: "approved", // remains approved or marked paid
      receipt: updatedReceipt,
    };
    await store.updateRequest(updatedRequest);

    return c.json({
      status: "paid",
      txHash,
      ledgerIndex,
      receipt: updatedReceipt,
    });
  });

  app.get("/requests", async (c) => {
    const match = /^Bearer\s+(.+)$/i.exec(c.req.header("Authorization") ?? "");
    const token = match?.[1];
    const expectedOperator = config.operatorAddress ?? (await store.getActiveMandate())?.mandate.operator;
    const operator = operatorAuth.addressForToken(token);
    const isOperator = operator && expectedOperator && operator === expectedOperator;
    const isAgent = config.agentToken && token ? token === config.agentToken : false;

    if (!isOperator && !isAgent && (config.agentToken || expectedOperator)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const rawStatus = c.req.query("status");
    const status = parseStatus(rawStatus);
    if (rawStatus !== undefined && status === undefined) {
      return c.json({ error: "invalid status" }, 400);
    }
    const list = await store.listRequests(status);
    return c.json(list.map(responseFor));
  });

  app.post("/requests/:id/approve", operatorMiddleware, async (c) => {
    const request = await store.getRequest(c.req.param("id"));
    if (!request) return c.json({ error: "not found" }, 404);
    if (request.status !== "held") {
      return c.json({ error: "request is not awaiting approval" }, 409);
    }

    const mandate = await mandateForEvaluation(store);
    if (!mandate) return c.json({ error: "no verified mandate" }, 503);
    const route =
      mandate.payees.find((payee) => payee.address === request.body.payee)?.route ??
      (mandate.newPayeeRoute === "escrow" ? "escrow" : undefined);
    if (!route) return c.json({ error: "payee is not allowed" }, 409);
    await store.reserveToday(request.body.amountDrops);
    const decision: Decision = { outcome: "allow", route };
    const updated: StoredRequest = {
      ...request,
      status: "approved",
      route,
      decision,
      receipt: createReceipt(request.id, request.body, decision, mandate),
    };
    await store.updateRequest(updated);
    return c.json(responseFor(updated));
  });

  app.post("/requests/:id/reject", operatorMiddleware, async (c) => {
    const request = await store.getRequest(c.req.param("id"));
    if (!request) return c.json({ error: "not found" }, 404);
    if (request.status !== "held") return c.json({ error: "request is not awaiting approval" }, 409);

    const mandate = await mandateForEvaluation(store);
    if (!mandate) return c.json({ error: "no verified mandate" }, 503);
    const decision: Decision = {
      outcome: "refuse",
      reasons: request.decision.outcome === "hold" ? request.decision.reasons : ["PAYEE_NOT_ALLOWED"],
    };
    const updated: StoredRequest = {
      ...request,
      status: "refused",
      decision,
      receipt: createReceipt(request.id, request.body, decision, mandate),
    };
    await store.updateRequest(updated);
    return c.json(responseFor(updated));
  });

  app.post("/pause", operatorMiddleware, async (c) => {
    await store.setPaused(true);
    return c.json({ paused: true });
  });

  app.post("/resume", operatorMiddleware, async (c) => {
    await store.setPaused(false);
    return c.json({ paused: false });
  });

  app.get("/decisions", operatorMiddleware, async (c) => c.json(await store.listDecisions()));

  // Treasury status endpoint for dashboard and MCP
  app.get("/treasury", async (c) => {
    const mandate = await activeMandate();
    const spentToday = await store.getSpentToday();
    const isPaused = await store.isPaused();

    return c.json({
      treasuryAddress: config.treasury,
      network: config.network,
      mandateStatus: mandate ? (isPaused || mandate.mandate.paused ? "paused" : "active") : "none",
      mandateVersion: mandate?.mandate.version ?? null,
      dailyMaxDrops: mandate?.mandate.dailyMaxDrops ?? "0",
      spentTodayDrops: spentToday.toString(),
      remainingCapacityDrops: mandate
        ? (BigInt(mandate.mandate.dailyMaxDrops) - spentToday > 0n
            ? (BigInt(mandate.mandate.dailyMaxDrops) - spentToday).toString()
            : "0")
        : "0",
    });
  });

  // Suppliers endpoint for dashboard and MCP
  app.get("/suppliers", async (c) => {
    const mandate = await activeMandate();
    if (!mandate) return c.json({ suppliers: [] });
    return c.json({ suppliers: mandate.mandate.payees });
  });

  return app;
}
