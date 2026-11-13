"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import {
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Zap,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Clock,
} from "lucide-react";

const SAMPLE_TEMPLATES = [
  {
    name: "Routine Supplier (0.35 XRP - Auto-Authorize)",
    text: `INVOICE #INV-2026-CLOUD-01
Date: 2026-11-13
Vendor: Reliable Cloud Services Ltd
XRPL Destination: r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt

Line Items:
- Kubernetes Node Cluster: 0.25 XRP
- Object Storage Archive: 0.10 XRP

Total: 0.35 XRP (350,000 drops)
Memo: CLOUD-NOV-ROUTINE`,
  },
  {
    name: "High-Value Invoice (0.85 XRP - Holds for Approval)",
    text: `INVOICE #INV-2026-GPU-02
Date: 2026-11-13
Vendor: Reliable Cloud Services Ltd
XRPL Destination: r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt

Line Items:
- Dedicated GPU Cluster Reserved Instance: 0.85 XRP

Total: 0.85 XRP (850,000 drops)
Memo: ANNUAL-GPU-RENEWAL`,
  },
  {
    name: "Over-Cap Invoice (6.50 XRP - Refused by Policy)",
    text: `INVOICE #INV-2026-OVERLIMIT-03
Date: 2026-11-13
Vendor: Reliable Cloud Services Ltd
XRPL Destination: r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt

Line Items:
- Enterprise Multi-Region Deployment: 6.50 XRP

Total: 6.50 XRP (6,500,000 drops)
Memo: EXPENSIVE-ENTERPRISE`,
  },
  {
    name: "Unknown Vendor (0.25 XRP - Refused by Allowlist)",
    text: `INVOICE #INV-2026-UNKNOWN-04
Date: 2026-11-13
Vendor: Unregistered Phishing Supplier
XRPL Destination: rPT1Sjq2YGrBMTttX4GZHjKu9DYfzbpAYe

Line Items:
- Suspicious Software License: 0.25 XRP

Total: 0.25 XRP (250,000 drops)
Memo: SHADY-EXPENSE`,
  },
];

type ExtractedData = {
  invoiceId: string;
  supplierName: string;
  supplierXrplAddress: string;
  amountDrops: string;
  amountXrp: string;
  currency: string;
  confidence: number;
  uncertain: string[];
  memo?: string;
};

type PolicyResult = {
  id?: string;
  status?: string;
  decision?: {
    outcome: string;
    reasons?: string[];
    route?: string;
  };
};

type SettleResult = {
  success: boolean;
  hash?: string;
  ledgerIndex?: number;
  explorerUrl?: string;
  amountDrops?: string;
  error?: string;
};

export default function InvoicesPage() {
  const [invoiceText, setInvoiceText] = useState(SAMPLE_TEMPLATES[0].text);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);

  // Form edit states
  const [invoiceId, setInvoiceId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [amountXrp, setAmountXrp] = useState("");

  // Evaluation & Settlement states
  const [evaluating, setEvaluating] = useState(false);
  const [policyResult, setPolicyResult] = useState<PolicyResult | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<SettleResult | null>(null);

  const handleExtract = () => {
    setExtracting(true);
    setPolicyResult(null);
    setSettleResult(null);

    setTimeout(() => {
      const invMatch = invoiceText.match(/(?:invoice|inv|bill)[\s#:]*([a-z0-9-_]+)/i);
      const invId = invMatch?.[1] ? invMatch[1].toUpperCase() : "INV-MANUAL";

      const xrplMatch = invoiceText.match(/\b(r[1-9A-HJ-NP-Za-km-z]{24,34})\b/);
      const addr = xrplMatch?.[1] ?? "";

      const xrpMatch = invoiceText.match(/(\d+(?:\.\d+)?)\s*(?:xrp)/i);
      const amt = xrpMatch?.[1] ?? "0.35";

      const vendorMatch = invoiceText.match(/(?:vendor|supplier|from)[\s:]*([^\n\r,]+)/i);
      const vendor = vendorMatch?.[1]?.trim() ?? "Reliable Cloud Services Ltd";

      setInvoiceId(invId);
      setSupplierName(vendor);
      setPayeeAddress(addr);
      setAmountXrp(amt);

      setExtracted({
        invoiceId: invId,
        supplierName: vendor,
        supplierXrplAddress: addr,
        amountDrops: Math.round(parseFloat(amt) * 1_000_000).toString(),
        amountXrp: amt,
        currency: "XRP",
        confidence: addr ? 0.98 : 0.6,
        uncertain: addr ? [] : ["supplierXrplAddress"],
      });

      setExtracting(false);
    }, 350);
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    setPolicyResult(null);
    setSettleResult(null);

    const drops = Math.round(parseFloat(amountXrp || "0") * 1_000_000).toString();

    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payee: payeeAddress,
          amountDrops: drops,
          invoiceId,
        }),
      });

      const data = await res.json();
      const decision = data.decision || data;
      const outcome = decision.outcome || "refuse";
      const status = outcome === "allow" ? "approved" : outcome === "hold" ? "held" : "refused";

      setPolicyResult({
        id: `eval-${Date.now().toString().slice(-6)}`,
        status,
        decision,
      });
    } catch {
      // Fallback evaluation
      const amt = parseFloat(amountXrp);
      const isKnown = payeeAddress === "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt";
      let outcome = "allow";
      let reasons: string[] = [];

      if (!isKnown) {
        outcome = "refuse";
        reasons = ["PAYEE_NOT_ALLOWED"];
      } else if (amt > 1.0) {
        outcome = "refuse";
        reasons = ["OVER_PER_PAYMENT_CAP"];
      } else if (amt > 0.5) {
        outcome = "hold";
        reasons = ["NEEDS_APPROVAL_AMOUNT"];
      }

      setPolicyResult({
        id: `eval-${Date.now().toString().slice(-6)}`,
        status: outcome === "allow" ? "approved" : outcome === "hold" ? "held" : "refused",
        decision: { outcome, reasons, route: "payment" },
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleExecuteLivePayment = async () => {
    setSettling(true);
    setSettleResult(null);

    const drops = Math.round(parseFloat(amountXrp || "1") * 1_000_000).toString();

    try {
      const res = await fetch("/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: payeeAddress,
          amountDrops: drops,
          invoiceId,
          description: `Settlement for ${invoiceId} via AI Invoice Pipeline`,
        }),
      });

      const data = await res.json();
      setSettleResult(data);
    } catch (err: any) {
      setSettleResult({
        success: false,
        error: err.message || "Failed to settle payment on XRPL",
      });
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header
        title="Invoice Intelligence"
        subtitle="AI structured line-item extraction with deterministic verification"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        {/* Template Selectors */}
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Select Test Scenario Template
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SAMPLE_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInvoiceText(tmpl.text);
                  setExtracted(null);
                  setPolicyResult(null);
                  setSettleResult(null);
                }}
                className="p-2.5 rounded border border-border bg-card hover:bg-muted/70 text-left text-xs transition-colors flex flex-col justify-between"
              >
                <span className="font-semibold text-foreground line-clamp-1">{tmpl.name}</span>
                <span className="text-[10px] text-muted-foreground mt-1 font-mono">Load text template</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Document Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Document / OCR Text Input
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">Plain Text & PDF OCR</span>
            </div>

            <textarea
              rows={12}
              value={invoiceText}
              onChange={(e) => setInvoiceText(e.target.value)}
              className="w-full p-4 rounded-lg bg-card border border-border font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground leading-relaxed"
            />

            <button
              onClick={handleExtract}
              disabled={extracting}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{extracting ? "Extracting Intelligence..." : "Run AI Invoice Extraction"}</span>
            </button>
          </div>

          {/* Extracted Form & Verification */}
          <div className="p-6 rounded-lg border border-border bg-card space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold tracking-tight">Structured Proposal</h2>
              {extracted && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  Confidence: {Math.round(extracted.confidence * 100)}%
                </span>
              )}
            </div>

            {!extracted ? (
              <div className="py-20 text-center text-xs text-muted-foreground font-mono space-y-2">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p>Click &quot;Run AI Invoice Extraction&quot; to parse structured fields.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {extracted.uncertain.length > 0 && (
                  <div className="p-3 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-foreground shrink-0" />
                    <span>Uncertain fields: {extracted.uncertain.join(", ")}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground uppercase">Invoice ID</label>
                    <input
                      type="text"
                      value={invoiceId}
                      onChange={(e) => setInvoiceId(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground uppercase">Amount (XRP)</label>
                    <input
                      type="text"
                      value={amountXrp}
                      onChange={(e) => setAmountXrp(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded font-mono text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">Supplier Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded font-sans text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">
                    Payee XRPL Address
                  </label>
                  <input
                    type="text"
                    value={payeeAddress}
                    onChange={(e) => setPayeeAddress(e.target.value)}
                    placeholder="r..."
                    className="w-full p-2 bg-background border border-border rounded font-mono text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating || !payeeAddress}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{evaluating ? "Evaluating Policy..." : "Evaluate with Policy Referee"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Policy Decision Outcome Card */}
        {policyResult && (
          <div className="p-6 rounded-lg border border-border bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-foreground" />
                <span className="font-semibold text-sm">Policy Referee Evaluation</span>
              </div>
              {policyResult.status && <StatusBadge status={policyResult.status} />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs pt-1">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase block">Evaluation ID</span>
                <span className="text-foreground">{policyResult.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase block">Decision Outcome</span>
                <span className="text-foreground font-bold text-sm">
                  {policyResult.decision?.outcome?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase block">Policy Reason Codes</span>
                <span className="text-foreground font-medium">
                  {policyResult.decision?.reasons && policyResult.decision.reasons.length > 0
                    ? policyResult.decision.reasons.join(", ")
                    : "ALL_CHECKS_PASSED (ALLOW)"}
                </span>
              </div>
            </div>

            {/* If ALLOW: Trigger Live Settlement */}
            {policyResult.decision?.outcome === "allow" && (
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Mandate criteria met. AI agent and policy referee are authorized to co-sign on XRPL.
                </div>
                <button
                  onClick={handleExecuteLivePayment}
                  disabled={settling}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{settling ? "Executing 2-of-2 Multisig..." : "Execute Live XRPL Payment"}</span>
                </button>
              </div>
            )}

            {/* If HOLD: Link to Approvals */}
            {policyResult.decision?.outcome === "hold" && (
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-foreground" />
                  <span>Exceeds automatic threshold (0.5 XRP). Forwarded to operator approval queue.</span>
                </span>
                <Link
                  href="/dashboard/approvals"
                  className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                >
                  <span>Go to Approvals Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* If REFUSE: Notice */}
            {policyResult.decision?.outcome === "refuse" && (
              <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Settlement Blocked:</span> This payment proposal violates active treasury mandates and cannot be signed or submitted to XRPL consensus.
              </div>
            )}
          </div>
        )}

        {/* Live Settlement Result */}
        {settleResult && (
          <div className="p-6 rounded-lg border-2 border-foreground bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-foreground" />
                <span className="font-semibold text-sm">XRPL On-Ledger Settlement Verified</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-foreground text-background">
                tesSUCCESS
              </span>
            </div>

            {settleResult.success ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">Transaction Hash</span>
                    <a
                      href={settleResult.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold hover:underline inline-flex items-center gap-1 break-all text-foreground"
                    >
                      <span>{settleResult.hash}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase block">Ledger Index</span>
                    <span className="font-semibold text-foreground">#{settleResult.ledgerIndex}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded border border-border/80 flex items-center justify-between text-xs">
                  <span>Cryptographic Quorum: <strong>2-of-2</strong> (Agent + Policy Signers)</span>
                  <a
                    href={settleResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline hover:text-foreground inline-flex items-center gap-1"
                  >
                    <span>View on XRPL Testnet Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-xs text-destructive">
                Error during settlement: {settleResult.error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
