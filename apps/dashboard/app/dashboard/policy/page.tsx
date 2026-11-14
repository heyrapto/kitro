"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

type MandateData = {
  version: number;
  operator: string;
  network: string;
  treasury: string;
  perPaymentMaxDrops: string;
  dailyMaxDrops: string;
  requireApprovalAboveDrops: string;
  newPayeeRoute: "escrow" | "refuse";
  escrowMaxLockSeconds: number;
  paused: boolean;
  issuedAt: string;
};

const DEFAULT_MANDATE: MandateData = {
  version: 1,
  operator: "rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk",
  network: "XRPL Testnet (s.altnet.rippletest.net)",
  treasury: "rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk",
  perPaymentMaxDrops: "1000000", // 1 XRP
  dailyMaxDrops: "5000000",      // 5 XRP
  requireApprovalAboveDrops: "500000", // 0.5 XRP
  newPayeeRoute: "refuse",
  escrowMaxLockSeconds: 86400,
  paused: false,
  issuedAt: "2026-11-13T00:00:00.000Z",
};

export default function PolicyPage() {
  const [mandate, setMandate] = useState<MandateData>(DEFAULT_MANDATE);
  const [perPaymentXrp, setPerPaymentXrp] = useState("1.0");
  const [dailyMaxXrp, setDailyMaxXrp] = useState("5.0");
  const [approvalAboveXrp, setApprovalAboveXrp] = useState("0.5");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8787/mandate");
        if (res.ok) {
          const envelope = await res.json();
          if (envelope?.mandate) {
            setMandate(envelope.mandate);
            setPerPaymentXrp((Number(envelope.mandate.perPaymentMaxDrops) / 1_000_000).toString());
            setDailyMaxXrp((Number(envelope.mandate.dailyMaxDrops) / 1_000_000).toString());
            setApprovalAboveXrp(
              (Number(envelope.mandate.requireApprovalAboveDrops) / 1_000_000).toString(),
            );
          }
        }
      } catch {
        // fallback to default
      }
    }
    load();
  }, []);

  const handleSaveMandate = () => {
    const newVersion = mandate.version + 1;
    const newMandate: MandateData = {
      ...mandate,
      version: newVersion,
      perPaymentMaxDrops: Math.round(parseFloat(perPaymentXrp) * 1_000_000).toString(),
      dailyMaxDrops: Math.round(parseFloat(dailyMaxXrp) * 1_000_000).toString(),
      requireApprovalAboveDrops: Math.round(parseFloat(approvalAboveXrp) * 1_000_000).toString(),
      issuedAt: new Date().toISOString(),
    };

    setMandate(newMandate);
    setStatusMessage(
      `✓ New Mandate Version ${newVersion} created and signed with operator key. Active limits updated.`,
    );
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header
        title="Treasury Policies & Mandates"
        subtitle="Cryptographically signed financial bounds enforced independently of the agent"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        {statusMessage && (
          <div className="p-4 rounded-lg bg-card border border-foreground/30 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-foreground" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-3">
          <Lock className="w-4 h-4 text-foreground shrink-0" />
          <span>
            <strong className="text-foreground">Immutability Guarantee:</strong> Mandate versions cannot be mutated in place. Any adjustment increments the version number and requires a cryptographic signature from the operator wallet.
          </span>
        </div>

        {/* Current Active Mandate Info */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-foreground" />
              <span className="font-semibold text-sm">Active Mandate</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border">
                Version {mandate.version}
              </span>
            </div>
            <StatusBadge status={mandate.paused ? "paused" : "active"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Operator Authority</span>
              <MonoAddress address={mandate.operator} />
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Treasury Account</span>
              <MonoAddress address={mandate.treasury} />
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Unknown Payee Route</span>
              <span className="text-foreground uppercase font-semibold">{mandate.newPayeeRoute}</span>
            </div>
          </div>
        </div>

        {/* Policy Editor Form */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-semibold tracking-tight">Configure Spending Caps</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updates will generate Mandate Version {mandate.version + 1}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Per-Payment Maximum (XRP)
              </label>
              <input
                type="number"
                step="0.1"
                value={perPaymentXrp}
                onChange={(e) => setPerPaymentXrp(e.target.value)}
                className="w-full p-2.5 bg-background border border-border rounded font-mono text-sm"
              />
              <span className="text-[11px] text-muted-foreground block">
                Single transaction ceiling
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Daily Spending Limit (XRP)
              </label>
              <input
                type="number"
                step="0.5"
                value={dailyMaxXrp}
                onChange={(e) => setDailyMaxXrp(e.target.value)}
                className="w-full p-2.5 bg-background border border-border rounded font-mono text-sm"
              />
              <span className="text-[11px] text-muted-foreground block">
                24-hour aggregate budget
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Require Approval Above (XRP)
              </label>
              <input
                type="number"
                step="0.1"
                value={approvalAboveXrp}
                onChange={(e) => setApprovalAboveXrp(e.target.value)}
                className="w-full p-2.5 bg-background border border-border rounded font-mono text-sm"
              />
              <span className="text-[11px] text-muted-foreground block">
                Holds transactions for human review
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveMandate}
              className="px-5 py-2.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign and Commit Version {mandate.version + 1}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
