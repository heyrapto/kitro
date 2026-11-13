"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { DropsAmount } from "@/components/drops-amount";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { Search, ExternalLink, Filter, Receipt } from "lucide-react";

type PaymentRow = {
  id: string;
  invoiceId: string;
  payee: string;
  amountDrops: string;
  status: "approved" | "held" | "refused" | string;
  reasons?: string[];
  route?: string;
  txHash?: string;
  createdAt: string;
};

const INITIAL_DATA: PaymentRow[] = [
  {
    id: "req-001",
    invoiceId: "INV-2026-904",
    payee: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    amountDrops: "750000",
    status: "approved",
    route: "payment",
    txHash: "E0F34B2190A5DCBAF45129038472948275910283749281749281749281749281",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "req-002",
    invoiceId: "INV-2026-905",
    payee: "rSupplierBAddress12345678901234567",
    amountDrops: "100000",
    status: "approved",
    route: "payment",
    txHash: "9283749281749281749281749281749281E0F34B2190A5DCBAF4512903847294",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "req-003",
    invoiceId: "INV-2026-HELD",
    payee: "rSupplierPendingApproval123456789",
    amountDrops: "3000000",
    status: "held",
    reasons: ["NEEDS_APPROVAL_AMOUNT"],
    createdAt: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    id: "req-004",
    invoiceId: "INV-2026-OVER",
    payee: "rSupplierUnknown998877665544332211",
    amountDrops: "6000000",
    status: "refused",
    reasons: ["OVER_PER_PAYMENT_CAP"],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>(INITIAL_DATA);
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
        // fallback
      }
    }
    load();
  }, []);

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.invoiceId.toLowerCase().includes(search.toLowerCase()) ||
      p.payee.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col">
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
              placeholder="Search by invoice or payee address..."
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
                <th className="py-3 px-4">Payee</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Decision Notes</th>
                <th className="py-3 px-4">Transaction</th>
                <th className="py-3 px-4 text-right">Actions</th>
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
                      <MonoAddress address={p.payee} />
                    </td>
                    <td className="py-3.5 px-4">
                      <DropsAmount drops={p.amountDrops} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {p.reasons && p.reasons.length > 0 ? p.reasons.join(", ") : p.route ?? "multisig"}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.txHash ? (
                        <a
                          href={`https://testnet.xrpl.org/transactions/${p.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-mono text-xs hover:underline text-muted-foreground hover:text-foreground"
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
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Inspection Drawer / Details Modal */}
        {selected && (
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-5 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-foreground" />
                  <span className="font-semibold text-sm">Payment Details</span>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Request ID</span>
                  <span className="text-foreground">{selected.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Invoice Identifier</span>
                  <span className="text-foreground font-semibold">{selected.invoiceId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Recipient XRPL Address</span>
                  <MonoAddress address={selected.payee} truncate={false} />
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Amount</span>
                  <DropsAmount drops={selected.amountDrops} showDrops={true} />
                </div>
                {selected.reasons && selected.reasons.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Policy Reasons</span>
                    <span className="text-foreground">{selected.reasons.join(", ")}</span>
                  </div>
                )}
                {selected.txHash && (
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">On-Ledger Hash</span>
                    <a
                      href={`https://testnet.xrpl.org/transactions/${selected.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{selected.txHash}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
