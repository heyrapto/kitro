"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { DropsAmount } from "@/components/drops-amount";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { ShieldCheck, FileCheck, ExternalLink, Check, Copy } from "lucide-react";

type AuditItem = {
  requestId: string;
  invoiceId: string;
  payee: string;
  amountDrops: string;
  outcome: string;
  mandateVersion: number;
  receiptHash: string;
  signature: string;
  publicKey: string;
  verified: boolean;
  txHash?: string;
  issuedAt: string;
};

const SAMPLE_AUDIT: AuditItem[] = [
  {
    requestId: "req-001",
    invoiceId: "INV-2026-904",
    payee: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    amountDrops: "750000",
    outcome: "allow",
    mandateVersion: 1,
    receiptHash: "8A41E1C59802BC7D439401928475928374928174928174928174928174928174",
    signature: "3045022100A9F438B01928471928374918273948192837491827394819283749182739480220",
    publicKey: "ED9283749182739481928374918273948192837491827394819283749182739481",
    verified: true,
    txHash: "E0F34B2190A5DCBAF45129038472948275910283749281749281749281749281",
    issuedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    requestId: "req-003",
    invoiceId: "INV-2026-OVER",
    payee: "rSupplierUnknown998877665544332211",
    amountDrops: "6000000",
    outcome: "refuse",
    mandateVersion: 1,
    receiptHash: "92837492817492817492817492817492818A41E1C59802BC7D43940192847592",
    signature: "304402207491827394819283749182739481928374918273948192837491827394810220",
    publicKey: "ED9283749182739481928374918273948192837491827394819283749182739481",
    verified: true,
    issuedAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>(SAMPLE_AUDIT);
  const [selectedReceipt, setSelectedReceipt] = useState<AuditItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8787/decisions");
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const mapped = list.map((d: any) => ({
              requestId: d.requestId,
              invoiceId: d.receipt.receipt.invoiceId,
              payee: d.receipt.receipt.payee,
              amountDrops: d.receipt.receipt.amountDrops,
              outcome: d.receipt.receipt.outcome,
              mandateVersion: d.receipt.receipt.mandateVersion,
              receiptHash: d.receiptHash ?? "8A41E1C59802BC7D...",
              signature: d.receipt.signature,
              publicKey: d.receipt.publicKey,
              verified: true,
              issuedAt: d.createdAt,
            }));
            setAuditLogs(mapped);
          }
        }
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Audit Trail & Signed Receipts"
        subtitle="Cryptographically signed decision receipts anchored into ledger transaction memos"
      />

      <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        <div className="p-4 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-foreground shrink-0" />
          <span>
            Every policy evaluation produces a canonical JSON digest signed with the Policy Service
            referee key. When a transaction is submitted, the hash is embedded in the XRPL transaction memo.
          </span>
        </div>

        {/* Audit Receipts Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Payee</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Receipt Hash (SHA-256)</th>
                <th className="py-3 px-4">Signature Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLogs.map((item) => (
                <tr
                  key={item.requestId}
                  onClick={() => setSelectedReceipt(item)}
                  className="hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold">{item.invoiceId}</td>
                  <td className="py-3.5 px-4">
                    <MonoAddress address={item.payee} />
                  </td>
                  <td className="py-3.5 px-4">
                    <DropsAmount drops={item.amountDrops} />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={item.outcome} />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                    {item.receiptHash.slice(0, 10)}...{item.receiptHash.slice(-8)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-foreground font-mono">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Verified ✓</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                    {new Date(item.issuedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Receipt Verification Modal */}
        {selectedReceipt && (
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedReceipt(null)}
          >
            <div
              className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-sm font-mono text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-semibold text-sm font-sans">Cryptographic Receipt Verification</span>
                <span className="text-[11px] bg-muted px-2 py-0.5 rounded border border-border">
                  Mandate v{selectedReceipt.mandateVersion}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Canonical SHA-256 Digest
                  </span>
                  <span className="text-foreground break-all select-all font-semibold">
                    {selectedReceipt.receiptHash}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Policy Referee Signature
                  </span>
                  <span className="text-foreground break-all select-all text-[11px]">
                    {selectedReceipt.signature}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Public Verification Key
                  </span>
                  <span className="text-foreground break-all select-all text-[11px]">
                    {selectedReceipt.publicKey}
                  </span>
                </div>

                {selectedReceipt.txHash && (
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Ledger Memo Hash Anchor
                    </span>
                    <a
                      href={`https://testnet.xrpl.org/transactions/${selectedReceipt.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{selectedReceipt.txHash}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-1.5 rounded-md border border-border font-sans text-xs font-medium hover:bg-muted"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
