import {
  type Db,
  mandates,
  requests,
  decisions,
  spend,
  eq,
  desc,
  and,
  sql,
} from "@kitro/db";
import type { MandateEnvelope, PaymentRequest, ReceiptEnvelope } from "@kitro/core";
import { receiptHash } from "@kitro/core";
import type { Decision, Reason } from "@kitro/rules";
import type {
  PolicyStore,
  RequestStatus,
  StoredDecision,
  StoredRequest,
} from "./store";

function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

export class DbPolicyStore implements PolicyStore {
  private paused = false;

  constructor(private readonly db: Db) {}

  async getActiveMandate(): Promise<MandateEnvelope | null> {
    const rows = await this.db
      .select()
      .from(mandates)
      .where(eq(mandates.active, true))
      .orderBy(desc(mandates.version))
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;
    const row = rows[0];

    return {
      mandate: row.body as unknown as MandateEnvelope["mandate"],
      publicKey: row.publicKey,
      signature: row.signature,
    };
  }

  async saveMandate(envelope: MandateEnvelope): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Deactivate previously active mandates
      await tx
        .update(mandates)
        .set({ active: false })
        .where(eq(mandates.active, true));

      // Insert new active mandate
      await tx.insert(mandates).values({
        version: envelope.mandate.version,
        body: envelope.mandate,
        signature: envelope.signature,
        publicKey: envelope.publicKey,
        active: true,
      });
    });
  }

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  async getSpentToday(): Promise<bigint> {
    const today = todayUtcString();
    const rows = await this.db
      .select({ reservedDrops: spend.reservedDrops })
      .from(spend)
      .where(eq(spend.day, today))
      .limit(1);

    if (rows.length === 0 || !rows[0]) return 0n;
    return BigInt(rows[0].reservedDrops);
  }

  async reserveToday(amountDrops: string): Promise<void> {
    const today = todayUtcString();
    await this.db
      .insert(spend)
      .values({
        day: today,
        reservedDrops: amountDrops,
        confirmedDrops: "0",
      })
      .onConflictDoUpdate({
        target: spend.day,
        set: {
          reservedDrops: sql`${spend.reservedDrops} + ${amountDrops}`,
        },
      });
  }

  async getRequestByInvoice(
    payee: string,
    invoiceId: string,
  ): Promise<StoredRequest | null> {
    const rows = await this.db
      .select()
      .from(requests)
      .where(and(eq(requests.payee, payee), eq(requests.invoiceId, invoiceId)))
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapToStoredRequest(rows[0]);
  }

  async createRequest(request: StoredRequest): Promise<void> {
    const rHash = receiptHash(request.receipt.receipt);

    await this.db.transaction(async (tx) => {
      await tx.insert(requests).values({
        id: request.id,
        invoiceId: request.body.invoiceId,
        payee: request.body.payee,
        amountDrops: request.body.amountDrops,
        status: request.status,
        route: request.route ?? null,
        createdAt: new Date(request.createdAt),
      });

      await tx.insert(decisions).values({
        requestId: request.id,
        outcome: request.decision.outcome,
        reasons: request.decision.outcome === "allow" ? [] : request.decision.reasons,
        mandateVersion: request.mandateVersion,
        receipt: request.receipt,
        receiptHash: rHash,
        createdAt: new Date(request.createdAt),
      });
    });
  }

  async getRequest(id: string): Promise<StoredRequest | null> {
    const rows = await this.db
      .select()
      .from(requests)
      .where(eq(requests.id, id))
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;
    return this.mapToStoredRequest(rows[0]);
  }

  async updateRequest(request: StoredRequest): Promise<void> {
    const rHash = receiptHash(request.receipt.receipt);

    await this.db.transaction(async (tx) => {
      await tx
        .update(requests)
        .set({
          status: request.status,
          route: request.route ?? null,
        })
        .where(eq(requests.id, request.id));

      await tx.insert(decisions).values({
        requestId: request.id,
        outcome: request.decision.outcome,
        reasons: request.decision.outcome === "allow" ? [] : request.decision.reasons,
        mandateVersion: request.mandateVersion,
        receipt: request.receipt,
        receiptHash: rHash,
        createdAt: new Date(),
      });
    });
  }

  async listRequests(status?: RequestStatus): Promise<StoredRequest[]> {
    const query = this.db.select().from(requests);
    const rows = status
      ? await query.where(eq(requests.status, status)).orderBy(desc(requests.createdAt))
      : await query.orderBy(desc(requests.createdAt));

    const result: StoredRequest[] = [];
    for (const row of rows) {
      const stored = await this.mapToStoredRequest(row);
      if (stored) result.push(stored);
    }
    return result;
  }

  async listDecisions(): Promise<StoredDecision[]> {
    const rows = await this.db
      .select()
      .from(decisions)
      .orderBy(desc(decisions.createdAt));

    return rows.map((r) => ({
      requestId: r.requestId,
      receipt: r.receipt as ReceiptEnvelope,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async mapToStoredRequest(row: typeof requests.$inferSelect): Promise<StoredRequest | null> {
    const decisionRows = await this.db
      .select()
      .from(decisions)
      .where(eq(decisions.requestId, row.id))
      .orderBy(desc(decisions.createdAt))
      .limit(1);

    if (decisionRows.length === 0 || !decisionRows[0]) return null;
    const decRow = decisionRows[0];
    const receiptEnv = decRow.receipt as ReceiptEnvelope;

    const decision: Decision =
      decRow.outcome === "allow"
        ? { outcome: "allow", route: (row.route as "payment" | "channel" | "escrow" | null) ?? "payment" }
        : decRow.outcome === "hold"
          ? { outcome: "hold", reasons: (decRow.reasons as Reason[]) ?? [] }
          : { outcome: "refuse", reasons: (decRow.reasons as Reason[]) ?? [] };

    const body: PaymentRequest = {
      invoiceId: row.invoiceId,
      payee: row.payee,
      amountDrops: row.amountDrops,
      ...(receiptEnv.receipt.route ? {} : {}),
    };

    return {
      id: row.id,
      body,
      status: row.status as RequestStatus,
      route: (row.route as "payment" | "channel" | "escrow" | null) ?? undefined,
      decision,
      mandateVersion: decRow.mandateVersion,
      receipt: receiptEnv,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
