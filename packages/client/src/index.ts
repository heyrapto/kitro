import type { MandateEnvelope, PaymentRequest, ReceiptEnvelope } from "@kitro/core";

export type PaymentDecisionResponse = {
  id: string;
  status: "received" | "held" | "approved" | "refused";
  decision: {
    outcome: "allow" | "hold" | "refuse";
    reasons?: string[];
    route?: "channel" | "payment" | "escrow";
  };
  receipt: ReceiptEnvelope;
  signingIntent?: {
    route: string;
    requestId: string;
    invoiceId: string;
    payee: string;
    amountDrops: string;
    destinationTag?: number;
  };
};

export type PaymentSignResponse = {
  status: "paid" | "signed";
  txHash: string;
  ledgerIndex?: number;
  receipt?: ReceiptEnvelope;
};

export type TreasuryStatus = {
  treasuryAddress: string;
  network: string;
  mandateStatus: "active" | "paused" | "none";
  mandateVersion: number | null;
  dailyMaxDrops: string;
  spentTodayDrops: string;
  remainingCapacityDrops: string;
};

export class KitroClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(config?: { baseUrl?: string; token?: string }) {
    this.baseUrl = (
      config?.baseUrl ??
      process.env.KITRO_API_URL ??
      "http://localhost:8787"
    ).replace(/\/$/, "");
    this.token = config?.token ?? process.env.AGENT_API_TOKEN;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  async requestPayment(request: PaymentRequest): Promise<PaymentDecisionResponse> {
    const response = await fetch(`${this.baseUrl}/requests`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Policy service error (${response.status}): ${JSON.stringify(err)}`);
    }

    return (await response.json()) as PaymentDecisionResponse;
  }

  async signAndSubmit(requestId: string, agentSignedBlob: string): Promise<PaymentSignResponse> {
    const response = await fetch(`${this.baseUrl}/requests/${requestId}/sign`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ agentSignedBlob }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Policy service signing error (${response.status}): ${JSON.stringify(err)}`);
    }

    return (await response.json()) as PaymentSignResponse;
  }

  async getRequest(id: string): Promise<PaymentDecisionResponse> {
    const response = await fetch(`${this.baseUrl}/requests/${id}`, {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch request ${id} (${response.status})`);
    }

    return (await response.json()) as PaymentDecisionResponse;
  }

  async getMandate(): Promise<MandateEnvelope | null> {
    const response = await fetch(`${this.baseUrl}/mandate`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to fetch mandate (${response.status})`);
    }
    return (await response.json()) as MandateEnvelope;
  }

  async getTreasury(): Promise<TreasuryStatus> {
    const response = await fetch(`${this.baseUrl}/treasury`);
    if (!response.ok) {
      throw new Error(`Failed to fetch treasury status (${response.status})`);
    }
    return (await response.json()) as TreasuryStatus;
  }

  async getSuppliers(): Promise<{ suppliers: Array<{ address: string; name: string; route: string }> }> {
    const response = await fetch(`${this.baseUrl}/suppliers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch suppliers (${response.status})`);
    }
    return (await response.json()) as { suppliers: Array<{ address: string; name: string; route: string }> };
  }

  async listRequests(status?: string): Promise<PaymentDecisionResponse[]> {
    const url = new URL(`${this.baseUrl}/requests`);
    if (status) {
      url.searchParams.set("status", status);
    }
    const response = await fetch(url.toString(), {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to list requests (${response.status})`);
    }
    return (await response.json()) as PaymentDecisionResponse[];
  }
}
