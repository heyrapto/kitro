"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { DropsAmount } from "@/components/drops-amount";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { Check, X, ShieldAlert, CheckCircle2 } from "lucide-react";

type HeldRequest = {
  id: string;
  invoiceId: string;
  payee: string;
  amountDrops: string;
  status: string;
  reasons: string[];
  createdAt: string;
};

const SAMPLE_HELD: HeldRequest[] = [
  {
    id: "req-held-001",
    invoiceId: "INV-2026-BIG-SERVER",
    payee: "rSupplierBAddress12345678901234567",
    amountDrops: "2500000", // 2.5 XRP (> 1.0 XRP approval threshold)
    status: "held",
    reasons: ["NEEDS_APPROVAL_AMOUNT"],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "req-held-002",
    invoiceId: "INV-2026-NEW-PAYEE",
    payee: "rNewVendorAddress99887766554433",
    amountDrops: "1200000",
    status: "held",
    reasons: ["PAYEE_ADDRESS_CHANGED", "NEEDS_APPROVAL_AMOUNT"],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

export default function ApprovalsPage() {
  const [heldRequests, setHeldRequests] = useState<HeldRequest[]>(SAMPLE_HELD);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8787/requests?status=held");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setHeldRequests(data);
          }
        }
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`http://localhost:8787/requests/${id}/approve`, {
        method: "POST",
      });
    } catch {
      // offline simulation
    }
    setHeldRequests((prev) => prev.filter((r) => r.id !== id));
    setActionMessage(`✓ Request ${id} approved. Policy co-signature unlocked.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`http://localhost:8787/requests/${id}/reject`, {
        method: "POST",
      });
    } catch {
      // offline simulation
    }
    setHeldRequests((prev) => prev.filter((r) => r.id !== id));
    setActionMessage(`✗ Request ${id} permanently rejected.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Approval Queue"
        subtitle="Operator authorization required for high-value or unusual transactions"
      />

      <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        {actionMessage && (
          <div className="p-4 rounded-lg bg-card border border-foreground/30 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-foreground" />
            <span>{actionMessage}</span>
          </div>
        )}

        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-3">
          <ShieldAlert className="w-4 h-4 text-foreground shrink-0" />
          <span>
            The AI agent cannot approve its own requests. Payments exceeding the configured mandate
            threshold remain held until signed by an authenticated operator.
          </span>
        </div>

        {heldRequests.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-border rounded-lg space-y-2">
            <span className="text-sm font-medium">Approval Queue Clear</span>
            <p className="text-xs text-muted-foreground">
              No transactions currently require human authorization.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {heldRequests.map((req) => (
              <div
                key={req.id}
                className="p-6 rounded-lg border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">{req.invoiceId}</span>
                    <StatusBadge status="held" />
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(req.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Recipient: </span>
                      <MonoAddress address={req.payee} />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount: </span>
                      <DropsAmount drops={req.amountDrops} className="text-sm font-semibold" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <span className="font-mono text-[11px] uppercase">Hold Reason:</span>
                    <span className="font-mono text-foreground font-medium">
                      {req.reasons.join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleReject(req.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Authorize Payment</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
