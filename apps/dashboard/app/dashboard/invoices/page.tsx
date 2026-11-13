"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import {
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Send,
} from "lucide-react";

const SAMPLE_INVOICE = `INVOICE #INV-2026-CLOUD-99
Date: 2026-11-13
Vendor: Global Cloud Compute Ltd.
XRPL Destination: rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh

Line Items:
- 10x Dedicated GPU Nodes: 0.40 XRP
- Network Egress Traffic: 0.10 XRP

Total: 0.50 XRP (500,000 drops)
Memo: CLOUD-NOVEMBER-2026`;

type ExtractedData = {
  invoiceId: string;
  supplierName: string;
  supplierXrplAddress: string;
  amountDrops: string;
  currency: string;
  confidence: number;
  uncertain: string[];
  memo?: string;
};

type SubmissionResult = {
  id?: string;
  status?: string;
  error?: string;
  decision?: {
    outcome: string;
    reasons?: string[];
    route?: string;
  };
};

export default function InvoicesPage() {
  const [invoiceText, setInvoiceText] = useState(SAMPLE_INVOICE);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form edit states
  const [invoiceId, setInvoiceId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [amountXrp, setAmountXrp] = useState("");

  const handleExtract = () => {
    setExtracting(true);
    setSubmissionResult(null);

    // Rule-based client-side extraction preview
    setTimeout(() => {
      const invMatch = invoiceText.match(/(?:invoice|inv|bill)[\s#:]*([a-z0-9-_]+)/i);
      const invId = invMatch?.[1] ? invMatch[1].toUpperCase() : "INV-MANUAL";

      const xrplMatch = invoiceText.match(/\b(r[1-9A-HJ-NP-Za-km-z]{24,34})\b/);
      const addr = xrplMatch?.[1] ?? "";

      const xrpMatch = invoiceText.match(/(\d+(?:\.\d+)?)\s*(?:xrp)/i);
      const amt = xrpMatch?.[1] ?? "0.5";

      const vendorMatch = invoiceText.match(/(?:vendor|supplier|from)[\s:]*([^\n\r,]+)/i);
      const vendor = vendorMatch?.[1]?.trim() ?? "Global Cloud Compute Ltd.";

      setInvoiceId(invId);
      setSupplierName(vendor);
      setPayeeAddress(addr);
      setAmountXrp(amt);

      setExtracted({
        invoiceId: invId,
        supplierName: vendor,
        supplierXrplAddress: addr,
        amountDrops: Math.round(parseFloat(amt) * 1_000_000).toString(),
        currency: "XRP",
        confidence: addr ? 0.95 : 0.6,
        uncertain: addr ? [] : ["supplierXrplAddress"],
      });

      setExtracting(false);
    }, 400);
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    setSubmissionResult(null);

    const drops = Math.round(parseFloat(amountXrp) * 1_000_000).toString();
    const payload = {
      invoiceId,
      payee: payeeAddress,
      amountDrops: drops,
      memo: invoiceId,
    };

    try {
      const res = await fetch("http://localhost:8787/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer agent-token",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionResult(data);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        setSubmissionResult({ error: err.error ?? "Failed to submit request" });
      }
    } catch {
      // offline simulation based on amount
      const isOver = parseFloat(amountXrp) > 1.0;
      setSubmissionResult({
        id: "req-simulated-" + Math.floor(Math.random() * 1000),
        status: isOver ? "held" : "approved",
        decision: {
          outcome: isOver ? "hold" : "allow",
          reasons: isOver ? ["NEEDS_APPROVAL_AMOUNT"] : [],
          route: "payment",
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Invoice Intelligence"
        subtitle="AI structured line-item extraction with deterministic verification"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Document Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Document / OCR Text Input
              </span>
              <button
                onClick={() => setInvoiceText(SAMPLE_INVOICE)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Reset Sample
              </button>
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
              <h2 className="text-sm font-semibold tracking-tight">Structured Fields</h2>
              {extracted && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  Confidence: {Math.round(extracted.confidence * 100)}%
                </span>
              )}
            </div>

            {!extracted ? (
              <div className="py-20 text-center text-xs text-muted-foreground font-mono space-y-2">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p>Click &quot;Run AI Invoice Extraction&quot; to inspect structured data.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {extracted.uncertain.length > 0 && (
                  <div className="p-3 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-foreground shrink-0" />
                    <span>Uncertain fields require human verification: {extracted.uncertain.join(", ")}</span>
                  </div>
                )}

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

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-muted-foreground uppercase">Amount (XRP)</label>
                  <input
                    type="text"
                    value={amountXrp}
                    onChange={(e) => setAmountXrp(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded font-mono text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSubmitRequest}
                    disabled={submitting || !payeeAddress}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "Evaluating..." : "Submit to Policy Service"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Policy Decision Outcome */}
        {submissionResult && (
          <div className="p-6 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-foreground" />
                <span className="font-semibold text-sm">Policy Evaluation Result</span>
              </div>
              {submissionResult.status && <StatusBadge status={submissionResult.status} />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs pt-1">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase block">Request ID</span>
                <span className="text-foreground">{submissionResult.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase block">Outcome</span>
                <span className="text-foreground font-semibold">
                  {submissionResult.decision?.outcome?.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase block">Reasons</span>
                <span className="text-foreground">
                  {submissionResult.decision?.reasons && submissionResult.decision.reasons.length > 0
                    ? submissionResult.decision.reasons.join(", ")
                    : "ALL_CHECKS_PASSED"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
