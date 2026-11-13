import type {
  Mandate,
  MandateEnvelope,
  PaymentRequest,
  ReceiptEnvelope,
} from "@kitro/core";
import type { Decision } from "@kitro/rules";

export type RequestStatus = "received" | "held" | "approved" | "refused";

export type StoredRequest = {
  id: string;
  body: PaymentRequest;
  status: RequestStatus;
  route?: "channel" | "payment" | "escrow";
  decision: Decision;
  mandateVersion: number;
  receipt: ReceiptEnvelope;
  createdAt: string;
};

export type StoredDecision = {
  requestId: string;
  receipt: ReceiptEnvelope;
  createdAt: string;
};

export interface PolicyStore {
  getActiveMandate(): MandateEnvelope | null;
  saveMandate(envelope: MandateEnvelope): void;
  isPaused(): boolean;
  setPaused(paused: boolean): void;
  getSpentToday(): bigint;
  reserveToday(amountDrops: string): void;
  getRequestByInvoice(payee: string, invoiceId: string): StoredRequest | null;
  createRequest(request: StoredRequest): void;
  getRequest(id: string): StoredRequest | null;
  updateRequest(request: StoredRequest): void;
  listRequests(status?: RequestStatus): StoredRequest[];
  listDecisions(): StoredDecision[];
}

export class MemoryPolicyStore implements PolicyStore {
  private mandate: MandateEnvelope | null = null;
  private paused = false;
  private spentToday = 0n;
  private readonly requests = new Map<string, StoredRequest>();
  private readonly decisions: StoredDecision[] = [];

  getActiveMandate(): MandateEnvelope | null {
    return this.mandate;
  }

  saveMandate(envelope: MandateEnvelope): void {
    this.mandate = envelope;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getSpentToday(): bigint {
    return this.spentToday;
  }

  reserveToday(amountDrops: string): void {
    this.spentToday += BigInt(amountDrops);
  }

  getRequestByInvoice(payee: string, invoiceId: string): StoredRequest | null {
    return (
      [...this.requests.values()].find(
        (request) => request.body.payee === payee && request.body.invoiceId === invoiceId,
      ) ?? null
    );
  }

  createRequest(request: StoredRequest): void {
    this.requests.set(request.id, request);
    this.decisions.push({
      requestId: request.id,
      receipt: request.receipt,
      createdAt: request.createdAt,
    });
  }

  getRequest(id: string): StoredRequest | null {
    return this.requests.get(id) ?? null;
  }

  updateRequest(request: StoredRequest): void {
    this.requests.set(request.id, request);
    this.decisions.push({
      requestId: request.id,
      receipt: request.receipt,
      createdAt: request.createdAt,
    });
  }

  listRequests(status?: RequestStatus): StoredRequest[] {
    return [...this.requests.values()].filter((request) =>
      status === undefined ? true : request.status === status,
    );
  }

  listDecisions(): StoredDecision[] {
    return [...this.decisions];
  }
}

export function mandateForEvaluation(store: PolicyStore): Mandate | null {
  const envelope = store.getActiveMandate();
  if (!envelope) return null;

  const mandate = envelope.mandate;
  return mandate.paused || store.isPaused() ? { ...mandate, paused: true } : mandate;
}
