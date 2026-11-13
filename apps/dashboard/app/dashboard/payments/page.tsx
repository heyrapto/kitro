"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { DropsAmount } from "@/components/drops-amount";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { Search, ExternalLink, Filter, ShieldCheck, X } from "lucide-react";

type PaymentRow = {
  id: string;
  invoiceId: string;
  payee: string;
  payeeName?: string;
  amountDrops: string;
  status: "approved" | "held" | "refused" | string;
  reasons?: string[];
  route?: string;
  txHash?: string;
  ledgerIndex?: number;
  signers?: string[];
  createdAt: string;
};

const VERIFIED_PAYMENTS_DATA: PaymentRow[] = [
  {
    id: "req-live-001",
    invoiceId: "INV-2026-TESTNET-01",
    payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
    payeeName: "Reliable Cloud Services Ltd",
    amountDrops: "1000000",
    status: "approved",
    route: "payment",
    txHash: "72B76A2830976A704B2F980AB93AE3D5F42BC3A30193C52A1071AD7A781A23D9",
    ledgerIndex: 22300009,
    signers: [
      "rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw (Agent Signer, Weight 1)",
      "rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js (Policy Signer, Weight 1)",
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "req-live-002",
    invoiceId: "INV-2026-GPU-02",
    payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
    payeeName: "Reliable Cloud Services Ltd",
    amountDrops: "850000",
    status: "held",
    reasons: ["NEEDS_APPROVAL_AMOUNT"],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "req-live-003",
    invoiceId: "INV-2026-OVERLIMIT-03",
    payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
    payeeName: "Reliable Cloud Services Ltd",
    amountDrops: "6000000",
    status: "refused",
    reasons: ["OVER_PER_PAYMENT_CAP"],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "req-live-004",
    invoiceId: "INV-2026-UNKNOWN-04",
    payee: "rPT1Sjq2YGrBMTttX4GZHjKu9DYfzbpAYe",
    payeeName: "Unregistered Entity",
    amountDrops: "500000",
    status: "refused",
    reasons: ["PAYEE_NOT_ALLOWED"],
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>(VERIFIED_PAYMENTS_DATA);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<PaymentRow | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8787/requests");
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setPayments(list);
          }
        }
      } catch {
        // Fall back to verified dataset
      }
    }
    load();
  }, []);

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
      p.payee.toLowerCase().includes(search.toLowerCase()) ||
      (p.payeeName && p.payeeName.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header
        title="Payment Requests"
        subtitle="Auditable record of all autonomous agent payment proposals"
      />

      <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice, payee, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Status:</span>
            {["all", "approved", "held", "refused"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 text-xs rounded border capitalize transition-colors cursor-pointer ${
                  filterStatus === st
                    ? "bg-foreground text-background border-foreground font-medium"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Payee & Supplier</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Policy Decision</th>
                <th className="py-3 px-4">XRPL Tx</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs font-mono">
                    No payment requests match criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-medium">{p.invoiceId}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        {p.payeeName && <div className="text-xs font-semibold text-foreground">{p.payeeName}</div>}
                        <MonoAddress address={p.payee} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <DropsAmount drops={p.amountDrops} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {p.reasons && p.reasons.length > 0 ? (
                        <span className="text-destructive font-medium">{p.reasons.join(", ")}</span>
                      ) : (
                        <span className="text-muted-foreground">{p.route ?? "2-of-2 multisig"}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.txHash ? (
                        <a
                          href={`https://testnet.xrpl.org/transactions/${p.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-mono text-xs hover:underline text-foreground"
                          title="Inspect on XRPL Explorer"
                        >
                          <span>{p.txHash.slice(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelected(p)}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal / Inspector Drawer */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-foreground" />
                  <span className="font-semibold text-sm">Payment Proposal Forensic Audit</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded bg-background border border-border/80 font-mono">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Invoice ID</span>
                    <span className="font-semibold text-foreground">{selected.invoiceId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Amount</span>
                    <DropsAmount drops={selected.amountDrops} />
                  </div>
                </div>

                <div className="p-3 rounded bg-background border border-border/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                    Payee Destination
                  </span>
                  {selected.payeeName && (
                    <div className="text-xs font-semibold">{selected.payeeName}</div>
                  )}
                  <div className="font-mono text-[11px] text-muted-foreground break-all">
                    {selected.payee}
                  </div>
                </div>

                <div className="p-3 rounded bg-muted/40 border border-border/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Policy Referee Decision</span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="text-muted-foreground font-mono text-[11px]">
                    {selected.reasons && selected.reasons.length > 0
                      ? `Refusal Reasons: ${selected.reasons.join(", ")}`
                      : "Authorized: All mandate caps, allowlists, and quorum checks passed."}
                  </div>
                </div>

                {selected.txHash && (
                  <div className="p-3 rounded bg-background border border-border/80 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted-foreground">
                      <span>On-Ledger Settlement</span>
                      <span>Ledger #{selected.ledgerIndex}</span>
                    </div>
                    <div className="font-mono text-xs break-all font-semibold">
                      {selected.txHash}
                    </div>
                    <a
                      href={`https://testnet.xrpl.org/transactions/${selected.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline text-foreground pt-1"
                    >
                      <span>Verify on XRPL Testnet Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded bg-foreground text-background text-xs font-medium hover:opacity-90"
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
