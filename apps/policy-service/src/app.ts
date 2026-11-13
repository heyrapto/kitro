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
    operatorAddress: process.env.OPERATOR_ADDRESS,
    policySeed: process.env.POLICY_SEED,
    agentToken: process.env.AGENT_API_TOKEN,
  },
) {
  const app = new Hono<{ Variables: AppVariables }>();
  const operatorAuth = config.operatorAuth ?? new OperatorAuth();
  const operatorMiddleware = operatorAuth.middleware(() => {
    return config.operatorAddress ?? store.getActiveMandate()?.mandate.operator ?? null;
  });

  const activeMandate = (): MandateEnvelopeType | null => store.getActiveMandate();

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
      issuedAt: nowIso(),
    };
    return signDecision(receipt);
  };

  app.get("/health", (c) =>
    c.json({ ok: true, service: "kitro-policy-service", store: store.constructor.name }),
  );

  app.get("/mandate", (c) => {
    const mandate = activeMandate();
    return mandate ? c.json(mandate) : c.json({ error: "no active mandate" }, 404);
  });

  app.post("/auth/challenge", async (c) => {
    const parsed = await c.req.json().catch(() => null);
    const address = typeof parsed?.address === "string" ? parsed.address : "";
    const expected = config.operatorAddress ?? activeMandate()?.mandate.operator;
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
    const current = activeMandate();
    if (
      !verifyMandate(envelope) ||
      envelope.mandate.network !== config.network ||
      envelope.mandate.treasury !== config.treasury ||
      (current && envelope.mandate.version <= current.mandate.version)
    ) {
      return c.json({ error: "mandate rejected" }, 409);
    }

    store.saveMandate(envelope);
    return c.json(envelope, 201);
  });

  app.post("/requests", agentAuth(config.agentToken), async (c) => {
    const parsed = PaymentRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid payment request" }, 400);

    const body = parsed.data;
    const existing = store.getRequestByInvoice(body.payee, body.invoiceId);
    if (existing) return c.json(responseFor(existing));

    const mandate = mandateForEvaluation(store);
    if (!mandate) return c.json({ error: "no verified mandate" }, 503);
    if (!config.policySeed) return c.json({ error: "policy signer is not configured" }, 503);

    const id = randomUUID();
    const decision = evaluate(mandate, body, {
      spentTodayDrops: store.getSpentToday(),
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

    if (decision.outcome === "allow") store.reserveToday(body.amountDrops);
    store.createRequest(stored);
    return c.json(responseFor(stored), 201);
  });

  app.get("/requests/:id", agentAuth(config.agentToken), (c) => {
    const request = store.getRequest(c.req.param("id"));
    return request ? c.json(responseFor(request)) : c.json({ error: "not found" }, 404);
  });

  app.post("/requests/:id/sign", agentAuth(config.agentToken), (c) =>
    c.json({ error: "multisig signing is not implemented" }, 501),
  );

  app.get("/requests", operatorMiddleware, (c) => {
    const rawStatus = c.req.query("status");
    const status = parseStatus(rawStatus);
    if (rawStatus !== undefined && status === undefined) {
      return c.json({ error: "invalid status" }, 400);
    }
    return c.json(store.listRequests(status).map(responseFor));
  });

  app.post("/requests/:id/approve", operatorMiddleware, (c) => {
    const request = store.getRequest(c.req.param("id"));
    if (!request) return c.json({ error: "not found" }, 404);
    if (request.status !== "held") {
      return c.json({ error: "request is not awaiting approval" }, 409);
    }

    const mandate = mandateForEvaluation(store);
    if (!mandate) return c.json({ error: "no verified mandate" }, 503);
    const route =
      mandate.payees.find((payee) => payee.address === request.body.payee)?.route ??
      (mandate.newPayeeRoute === "escrow" ? "escrow" : undefined);
    if (!route) return c.json({ error: "payee is not allowed" }, 409);
    store.reserveToday(request.body.amountDrops);
    const decision: Decision = { outcome: "allow", route };
    const updated: StoredRequest = {
      ...request,
      status: "approved",
      route,
      decision,
      receipt: createReceipt(request.id, request.body, decision, mandate),
    };
    store.updateRequest(updated);
    return c.json(responseFor(updated));
  });

  app.post("/requests/:id/reject", operatorMiddleware, (c) => {
    const request = store.getRequest(c.req.param("id"));
    if (!request) return c.json({ error: "not found" }, 404);
    if (request.status !== "held") return c.json({ error: "request is not awaiting approval" }, 409);

    const mandate = mandateForEvaluation(store);
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
    store.updateRequest(updated);
    return c.json(responseFor(updated));
  });

  app.post("/pause", operatorMiddleware, (c) => {
    store.setPaused(true);
    return c.json({ paused: true });
  });

  app.post("/resume", operatorMiddleware, (c) => {
    store.setPaused(false);
    return c.json({ paused: false });
  });

  app.get("/decisions", operatorMiddleware, (c) => c.json(store.listDecisions()));

  return app;
}
