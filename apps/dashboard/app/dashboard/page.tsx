"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { DropsAmount } from "@/components/drops-amount";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import {
  Wallet,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

type TreasuryInfo = {
  treasuryAddress: string;
  network: string;
  mandateStatus: string;
  mandateVersion: number | null;
  dailyMaxDrops: string;
  spentTodayDrops: string;
  remainingCapacityDrops: string;
};

type PaymentRequestItem = {
  id: string;
  invoiceId: string;
  payee: string;
  amountDrops: string;
  status: string;
  outcome: string;
  createdAt: string;
  txHash?: string;
};

export default function DashboardOverviewPage() {
  const [treasury, setTreasury] = useState<TreasuryInfo>({
    treasuryAddress: "rTreasuryAccountDemoTestnet12345678",
    network: "xrpl:1 (Testnet)",
    mandateStatus: "active",
    mandateVersion: 1,
    dailyMaxDrops: "5000000",
    spentTodayDrops: "850000",
    remainingCapacityDrops: "4150000",
  });

  const [requests] = useState<PaymentRequestItem[]>([
    {
      id: "req-001",
      invoiceId: "INV-2026-904",
      payee: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      amountDrops: "750000",
      status: "approved",
      outcome: "allow",
      createdAt: "2026-11-13T15:00:00.000Z",
      txHash: "E0F34B2190A5DCBAF45129038472948275910283749281749281749281749281",
    },
    {
      id: "req-002",
      invoiceId: "INV-2026-905",
      payee: "rSupplierBAddress12345678901234567",
      amountDrops: "100000",
      status: "approved",
      outcome: "allow",
      createdAt: "2026-11-13T14:00:00.000Z",
      txHash: "9283749281749281749281749281749281E0F34B2190A5DCBAF4512903847294",
    },
    {
      id: "req-003",
      invoiceId: "INV-2026-OVER",
      payee: "rSupplierUnknown998877665544332211",
      amountDrops: "6000000",
      status: "refused",
      outcome: "refuse",
      createdAt: "2026-11-13T13:00:00.000Z",
    },
  ]);

  const [loading, setLoading] = useState(false);

  // Fetch real data from policy service if running
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("http://localhost:8787/treasury");
        if (res.ok) {
          const data = await res.json();
          setTreasury((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // use fallback demo data
      }
    }
    loadData();
  }, []);

  const handleTogglePause = async () => {
    setLoading(true);
    const endpoint =
      treasury.mandateStatus === "paused"
        ? "http://localhost:8787/resume"
        : "http://localhost:8787/pause";
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        setTreasury((prev) => ({
          ...prev,
          mandateStatus: prev.mandateStatus === "paused" ? "active" : "paused",
        }));
      } else {
        setTreasury((prev) => ({
          ...prev,
          mandateStatus: prev.mandateStatus === "paused" ? "active" : "paused",
        }));
      }
    } catch {
      // offline toggle demo
      setTreasury((prev) => ({
        ...prev,
        mandateStatus: prev.mandateStatus === "paused" ? "active" : "paused",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Treasury Overview"
        subtitle="Policy-controlled business treasury operating on XRPL Testnet"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        {/* Treasury Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/40">
              <Wallet className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">Treasury Account</span>
                <StatusBadge status={treasury.mandateStatus} />
              </div>
              <div className="mt-1">
                <MonoAddress address={treasury.treasuryAddress} truncate={false} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePause}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              {treasury.mandateStatus === "paused" ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Resume Treasury</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Emergency Pause</span>
                </>
              )}
            </button>
            <Link
              href="/dashboard/policy"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <span>Edit Mandate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Balance */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              Ledger Float
            </span>
            <div className="text-2xl font-semibold tracking-tight">
              <DropsAmount drops="25000000" />
            </div>
            <p className="text-[11px] text-muted-foreground">Native XRPL account balance</p>
          </div>

          {/* Card 2: Daily Spending Limit */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              Daily Limit
            </span>
            <div className="text-2xl font-semibold tracking-tight">
              <DropsAmount drops={treasury.dailyMaxDrops} />
            </div>
            <p className="text-[11px] text-muted-foreground">Enforced by Mandate v{treasury.mandateVersion ?? 1}</p>
          </div>

          {/* Card 3: Spent Today */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Spent Today</span>
              <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
            <div className="text-2xl font-semibold tracking-tight">
              <DropsAmount drops={treasury.spentTodayDrops} />
            </div>
            <p className="text-[11px] text-muted-foreground">Reserved & confirmed transactions</p>
          </div>

          {/* Card 4: Remaining Capacity */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Policy Capacity</span>
              <ShieldCheck className="w-3.5 h-3.5 text-foreground" />
            </span>
            <div className="text-2xl font-semibold tracking-tight">
              <DropsAmount drops={treasury.remainingCapacityDrops} />
            </div>
            <p className="text-[11px] text-muted-foreground">Remaining today without human sign-off</p>
          </div>
        </div>

        {/* Signer Quorum Security Model Card */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">XRPL Signer List Architecture</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                On-ledger 2-of-2 multisigning quorum active
              </p>
            </div>
            <span className="text-xs font-mono bg-muted/60 px-2 py-1 rounded border border-border">
              QUORUM: 2
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded border border-border/80 bg-background space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Signer 1 — Autonomous AI Agent</span>
                <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Weight: 1
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Holds key to propose payments and submit agent signature. Cannot settle transactions alone.
              </p>
            </div>

            <div className="p-4 rounded border border-border/80 bg-background space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Signer 2 — Policy Referee Service</span>
                <span className="text-[10px] font-mono uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Weight: 1
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Independently validates mandates, spending caps, and allowlists before issuing co-signature.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Payment Requests Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Recent Payment Requests</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluated deterministically by policy service
              </p>
            </div>
            <Link
              href="/dashboard/payments"
              className="text-xs font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Policy Decision</th>
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-medium">{r.invoiceId}</td>
                    <td className="py-3.5 px-4">
                      <MonoAddress address={r.payee} />
                    </td>
                    <td className="py-3.5 px-4">
                      <DropsAmount drops={r.amountDrops} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {r.txHash ? (
                        <a
                          href={`https://testnet.xrpl.org/transactions/${r.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs hover:underline text-muted-foreground hover:text-foreground"
                        >
                          <span>{r.txHash.slice(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(r.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
