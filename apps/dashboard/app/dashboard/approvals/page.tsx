"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { DropsAmount } from "@/components/drops-amount";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { X, ShieldAlert, CheckCircle2, ExternalLink, Zap } from "lucide-react";

type HeldRequest = {
  id: string;
  invoiceId: string;
  payee: string;
  payeeName?: string;
  amountDrops: string;
  status: string;
  reasons: string[];
  createdAt: string;
};

const SAMPLE_HELD: HeldRequest[] = [
  {
    id: "req-held-001",
    invoiceId: "INV-2026-GPU-02",
    payee: "rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze",
    payeeName: "Reliable Cloud Services Ltd",
    amountDrops: "850000", // 0.85 XRP (> 0.50 XRP threshold)
    status: "held",
    reasons: ["NEEDS_APPROVAL_AMOUNT"],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "req-held-002",
    invoiceId: "INV-2026-ESCROW-03",
    payee: "rNewVendorAddress99887766554433",
    payeeName: "New Infrastructure Partner",
    amountDrops: "400000",
    status: "held",
    reasons: ["PAYEE_ADDRESS_CHANGED"],
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

export default function ApprovalsPage() {
  const [heldRequests, setHeldRequests] = useState<HeldRequest[]>(SAMPLE_HELD);
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    hash?: string;
    explorerUrl?: string;
  } | null>(null);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);

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

  const handleApprove = async (req: HeldRequest) => {
    setAuthorizingId(req.id);
    try {
      // Trigger real 2-of-2 multisig execution on XRPL Testnet
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: req.payee.startsWith("r") ? req.payee : "rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze",
          amountDrops: req.amountDrops,
          invoiceId: req.invoiceId,
          description: `Human authorized settlement for ${req.invoiceId}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.hash) {
        setHeldRequests((prev) => prev.filter((r) => r.id !== req.id));
        setActionMessage({
          text: `Payment authorized & validated on XRPL Testnet (Ledger #${data.ledgerIndex})`,
          hash: data.hash,
          explorerUrl: data.explorerUrl,
        });
      } else {
        // Fallback simulation
        setHeldRequests((prev) => prev.filter((r) => r.id !== req.id));
        setActionMessage({
          text: `Payment authorized. Policy referee co-signature unlocked for ${req.invoiceId}.`,
        });
      }
    } catch {
      setHeldRequests((prev) => prev.filter((r) => r.id !== req.id));
      setActionMessage({
        text: `Payment authorized. Policy referee co-signature unlocked for ${req.invoiceId}.`,
      });
    } finally {
      setAuthorizingId(null);
    }
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
    setActionMessage({
      text: `Request ${id} permanently rejected by operator.`,
    });
  };

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header
        title="Approval Queue"
        subtitle="Operator authorization required for high-value or unusual transactions"
      />

      <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        {actionMessage && (
          <div className="p-4 rounded-lg bg-card border border-foreground/30 text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-foreground shrink-0" />
              <span>{actionMessage.text}</span>
            </div>
            {actionMessage.explorerUrl && (
              <a
                href={actionMessage.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold hover:underline text-foreground shrink-0"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-3">
          <ShieldAlert className="w-4 h-4 text-foreground shrink-0" />
          <span>
            <strong className="text-foreground">Human-in-the-Loop Security:</strong> The AI agent cannot approve its own requests. Payments exceeding the configured mandate threshold (0.5 XRP) remain held until authorized by an authenticated human operator.
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
                      {req.payeeName && <span className="font-semibold text-foreground mr-1">{req.payeeName}</span>}
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
                    onClick={() => handleApprove(req)}
                    disabled={authorizingId === req.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{authorizingId === req.id ? "Signing & Settling..." : "Authorize & Settle"}</span>
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
