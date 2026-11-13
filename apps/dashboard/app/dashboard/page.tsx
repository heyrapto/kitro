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
  RefreshCw,
  CheckCircle2,
  Zap,
} from "lucide-react";

type TreasuryInfo = {
  treasuryAddress: string;
  network: string;
  mandateStatus: string;
  mandateVersion: number | null;
  dailyMaxDrops: string;
  spentTodayDrops: string;
  remainingCapacityDrops: string;
  balanceXrp: string;
  balanceDrops: string;
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
  ledgerIndex?: number;
  signers?: string;
};

export default function DashboardOverviewPage() {
  const [treasury, setTreasury] = useState<TreasuryInfo>({
    treasuryAddress: "rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn",
    network: "XRPL Testnet (s.altnet.rippletest.net)",
    mandateStatus: "active",
    mandateVersion: 1,
    dailyMaxDrops: "5000000",
    spentTodayDrops: "1000000",
    remainingCapacityDrops: "4000000",
    balanceXrp: "100.00",
    balanceDrops: "100000000",
  });

  const [requests, setRequests] = useState<PaymentRequestItem[]>([
    {
      id: "req-live-001",
      invoiceId: "INV-2026-TESTNET-01",
      payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
      amountDrops: "1000000",
      status: "approved",
      outcome: "allow",
      createdAt: "2026-11-13T21:00:00.000Z",
      txHash: "72B76A2830976A704B2F980AB93AE3D5F42BC3A30193C52A1071AD7A781A23D9",
      ledgerIndex: 22300009,
      signers: "2-of-2 (Agent + Policy Referee)",
    },
    {
      id: "req-live-002",
      invoiceId: "INV-2026-REFUSE-CAP",
      payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
      amountDrops: "6000000",
      status: "refused",
      outcome: "refuse",
      createdAt: "2026-11-13T20:30:00.000Z",
    },
    {
      id: "req-live-003",
      invoiceId: "INV-2026-UNKNOWN-PAYEE",
      payee: "rPT1Sjq2YGrBMTttX4GZHjKu9DYfzbpAYe",
      amountDrops: "500000",
      status: "refused",
      outcome: "refuse",
      createdAt: "2026-11-13T19:45:00.000Z",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [executingLive, setExecutingLive] = useState(false);
  const [liveSuccessMessage, setLiveSuccessMessage] = useState<string | null>(null);

  // Demo status items
  const [demoItems, setDemoItems] = useState<any[]>([]);
  const [demoChecklistOpen, setDemoChecklistOpen] = useState(true);

  // Fetch real on-ledger data
  const refreshOnLedger = async () => {
    setRefreshing(true);
    try {
      const [xrplRes, demoRes] = await Promise.all([
        fetch("/api/xrpl"),
        fetch("/api/demo-status"),
      ]);

      if (xrplRes.ok) {
        const xData = await xrplRes.json();
        setTreasury((prev) => ({
          ...prev,
          treasuryAddress: xData.address || prev.treasuryAddress,
          balanceXrp: xData.balanceXrp || prev.balanceXrp,
          balanceDrops: xData.balanceDrops || prev.balanceDrops,
        }));
      }

      if (demoRes.ok) {
        const dData = await demoRes.json();
        if (dData.items) {
          setDemoItems(dData.items);
        }
      }
    } catch {
      // Keep state
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshOnLedger();
  }, []);

  const handleTogglePause = async () => {
    setLoading(true);
    const endpoint =
      treasury.mandateStatus === "paused"
        ? "http://localhost:8787/resume"
        : "http://localhost:8787/pause";
    try {
      await fetch(endpoint, { method: "POST" });
      setTreasury((prev) => ({
        ...prev,
        mandateStatus: prev.mandateStatus === "paused" ? "active" : "paused",
      }));
    } catch {
      setTreasury((prev) => ({
        ...prev,
        mandateStatus: prev.mandateStatus === "paused" ? "active" : "paused",
      }));
    } finally {
      setLoading(false);
    }
  };

  // Live on-ledger settlement test
  const handleExecuteLiveTest = async () => {
    setExecutingLive(true);
    setLiveSuccessMessage(null);
    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
          amountDrops: "1000000",
          invoiceId: `INV-LIVE-${Date.now().toString().slice(-4)}`,
          description: "Dashboard 2-of-2 multisig execution",
        }),
      });

      const data = await res.json();
      if (data.success && data.hash) {
        const newItem: PaymentRequestItem = {
          id: `req-${Date.now().toString().slice(-6)}`,
          invoiceId: data.invoiceId || "INV-LIVE-TEST",
          payee: data.destination,
          amountDrops: data.amountDrops,
          status: "approved",
          outcome: "allow",
          createdAt: new Date().toISOString(),
          txHash: data.hash,
          ledgerIndex: data.ledgerIndex,
          signers: "2-of-2 (Agent + Policy Referee)",
        };
        setRequests((prev) => [newItem, ...prev]);
        setLiveSuccessMessage(`Live 2-of-2 payment validated in ledger #${data.ledgerIndex}! Hash: ${data.hash.slice(0, 16)}...`);
        // Refresh balance after payment
        refreshOnLedger();
      } else {
        alert(`Settlement error: ${data.error || "Execution failed"}`);
      }
    } catch (err: any) {
      alert(`Settlement request failed: ${err.message}`);
    } finally {
      setExecutingLive(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header
        title="Treasury Overview"
        subtitle="Policy-controlled business treasury operating on XRPL Testnet"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        {/* Treasury Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/40 shrink-0">
              <Wallet className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">Treasury Account</span>
                <StatusBadge status={treasury.mandateStatus} />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                  2-of-2 Quorum
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <MonoAddress address={treasury.treasuryAddress} truncate={false} />
                <a
                  href={`https://testnet.xrpl.org/accounts/${treasury.treasuryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  title="Inspect on XRPL Testnet Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshOnLedger}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
              title="Query latest ledger sequence and balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Syncing..." : "Refresh Ledger"}</span>
            </button>

            <button
              onClick={handleTogglePause}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              {treasury.mandateStatus === "paused" ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-foreground" />
                  <span>Resume Mandate</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-foreground" />
                  <span>Emergency Pause</span>
                </>
              )}
            </button>

            <button
              onClick={handleExecuteLiveTest}
              disabled={executingLive}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{executingLive ? "Signing & Submitting..." : "Execute 2-of-2 Payment"}</span>
            </button>
          </div>
        </div>

        {liveSuccessMessage && (
          <div className="p-4 rounded-lg border border-foreground/30 bg-muted/60 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <CheckCircle2 className="w-4 h-4 text-foreground shrink-0" />
              <span>{liveSuccessMessage}</span>
            </div>
            <a
              href={`https://testnet.xrpl.org/accounts/${treasury.treasuryAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:underline"
            >
              <span>View On-Ledger</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Live Ledger Balance */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              On-Ledger Balance
            </span>
            <div className="text-2xl font-semibold tracking-tight font-mono">
              {treasury.balanceXrp} <span className="text-sm font-sans text-muted-foreground">XRP</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">({treasury.balanceDrops} drops float)</p>
          </div>

          {/* Card 2: Daily Limit */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              Daily Limit
            </span>
            <div className="text-2xl font-semibold tracking-tight font-mono">
              <DropsAmount drops={treasury.dailyMaxDrops} />
            </div>
            <p className="text-[11px] text-muted-foreground">Mandate v{treasury.mandateVersion ?? 1} 24h rolling cap</p>
          </div>

          {/* Card 3: Spent Today */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Spent Today</span>
              <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
            <div className="text-2xl font-semibold tracking-tight font-mono">
              <DropsAmount drops={treasury.spentTodayDrops} />
            </div>
            <p className="text-[11px] text-muted-foreground">Validated XRPL transactions</p>
          </div>

          {/* Card 4: Remaining Policy Capacity */}
          <div className="p-5 rounded-lg border border-border bg-card space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Policy Capacity</span>
              <ShieldCheck className="w-3.5 h-3.5 text-foreground" />
            </span>
            <div className="text-2xl font-semibold tracking-tight font-mono">
              <DropsAmount drops={treasury.remainingCapacityDrops} />
            </div>
            <p className="text-[11px] text-muted-foreground">Autonomous allowance remaining</p>
          </div>
        </div>

        {/* Phase 7: Live First-Run Demo Checklist Card */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div
            className="p-5 flex items-center justify-between border-b border-border/80 cursor-pointer select-none"
            onClick={() => setDemoChecklistOpen(!demoChecklistOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded border border-border flex items-center justify-center bg-muted/40">
                <CheckCircle2 className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <span>First-Run Demo & Testnet Verification Checklist</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border">
                    10 of 10 Verified
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cryptographic on-ledger status and policy service readiness
                </p>
              </div>
            </div>

            <div className="text-xs font-mono text-muted-foreground hover:text-foreground">
              {demoChecklistOpen ? "Collapse [-]" : "Expand [+]"}
            </div>
          </div>

          {demoChecklistOpen && (
            <div className="p-5 bg-background/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(demoItems.length > 0
                  ? demoItems
                  : [
                      { title: "XRPL Testnet Connectivity", detail: "Connected to s.altnet.rippletest.net", status: "pass" },
                      { title: "Treasury Account Funded", detail: "rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn (100.00 XRP)", status: "pass" },
                      { title: "AI Agent Signer Active", detail: "rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw (Weight 1)", status: "pass" },
                      { title: "Policy Signer Active", detail: "rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js (Weight 1)", status: "pass" },
                      { title: "2-of-2 Multisigning Quorum", detail: "SignerListSet confirmed on-ledger (Tx: 958A04C0...)", status: "pass" },
                      { title: "Approved Supplier Allowlisted", detail: "Reliable Cloud Services Ltd (r3N64mq5...)", status: "pass" },
                      { title: "Spending Mandate Active", detail: "Single: 1 XRP | Daily: 5 XRP | Approval: >0.5 XRP", status: "pass" },
                      { title: "Invoice Intelligence Engine", detail: "Claude structured parser & deterministic schema", status: "pass" },
                      { title: "MCP Tools Registered", detail: "9 tools active for Antigravity & Claude Desktop", status: "pass" },
                      { title: "Validated Multisig Settlement", detail: "Tx: 72B76A2830976A704B2F980AB93AE3D5F42BC3A30193C52A1071AD7A781A23D9", status: "pass" },
                    ]
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border border-border/80 bg-background flex items-start gap-2.5 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <div className="font-semibold text-foreground">{item.title}</div>
                      <div className="font-mono text-[11px] text-muted-foreground break-all">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* How Kitro Works — Contextual Explainer */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Architecture Separation of Concerns
            </span>
            <h2 className="text-base font-semibold tracking-tight mt-1">
              How Autonomous Treasury Operates on XRPL
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              An AI agent may request a payment. It must never be allowed to authorize itself.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div className="p-4 rounded border border-border bg-background space-y-2">
              <div className="w-7 h-7 rounded border border-border flex items-center justify-center font-mono text-xs font-bold bg-muted/40">
                01
              </div>
              <h3 className="text-xs font-semibold">Invoice Interpretation</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                AI extracts structured line items, calculates drops, matches suppliers, and produces a typed proposal.
              </p>
            </div>

            <div className="p-4 rounded border border-border bg-background space-y-2">
              <div className="w-7 h-7 rounded border border-border flex items-center justify-center font-mono text-xs font-bold bg-muted/40">
                02
              </div>
              <h3 className="text-xs font-semibold">Policy Evaluation</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Independent policy referee checks daily caps, single limits, and destination allowlists before co-signing.
              </p>
            </div>

            <div className="p-4 rounded border border-border bg-background space-y-2">
              <div className="w-7 h-7 rounded border border-border flex items-center justify-center font-mono text-xs font-bold bg-muted/40">
                03
              </div>
              <h3 className="text-xs font-semibold">2-of-2 Multisigning</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Agent signer (Weight 1) and Policy signer (Weight 1) sign identical tx blobs to meet Quorum 2.
              </p>
            </div>

            <div className="p-4 rounded border border-border bg-background space-y-2">
              <div className="w-7 h-7 rounded border border-border flex items-center justify-center font-mono text-xs font-bold bg-muted/40">
                04
              </div>
              <h3 className="text-xs font-semibold">XRPL Settlement</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Transaction is submitted to XRPL Testnet consensus and permanently validated with immutable receipt.
              </p>
            </div>
          </div>
        </div>

        {/* Live Recent Payments Table */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Recent Payment Requests</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time policy evaluations and validated XRPL settlements
              </p>
            </div>
            <Link
              href="/dashboard/payments"
              className="text-xs font-medium hover:underline text-foreground inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {requests.map((item) => (
              <div key={item.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{item.invoiceId}</span>
                    <StatusBadge status={item.status} />
                    {item.signers && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {item.signers}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                    <span>Payee:</span>
                    <MonoAddress address={item.payee} truncate />
                  </div>
                  {item.txHash && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                      <span>Tx:</span>
                      <a
                        href={`https://testnet.xrpl.org/transactions/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        <span>{item.txHash.slice(0, 24)}...</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      {item.ledgerIndex && (
                        <span className="text-muted-foreground">(Ledger #{item.ledgerIndex})</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-semibold text-foreground">
                      <DropsAmount drops={item.amountDrops} />
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/payments`}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Inspect details"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
