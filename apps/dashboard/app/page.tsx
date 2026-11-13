import Link from "next/link";
import { ArrowRight, ShieldCheck, Cpu, Landmark, Lock, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* Top Bar */}
      <header className="border-b border-border/80 px-8 py-5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-foreground text-background flex items-center justify-center font-mono font-bold text-sm rounded">
            K
          </div>
          <span className="font-semibold tracking-tight text-lg">KITRO</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5 rounded">
            XRPL Testnet
          </span>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <span>Guided Setup</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="px-8 pt-24 pb-20 max-w-5xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground font-mono uppercase tracking-wider mb-6">
          <span>Policy-Controlled Autonomous Treasury</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Let AI handle the work.
          <br />
          <span className="text-muted-foreground">Keep control of the money.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Kitro gives businesses the speed of AI invoice automation without giving agents unrestricted
          access to company funds. Native XRP Ledger multisigning and an independent deterministic policy
          service ensure no agent can ever authorize itself.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span>Start Guided Setup</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
          >
            <span>Open Dashboard</span>
          </Link>
          <a
            href="https://testnet.xrpl.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>testnet.xrpl.org ↗</span>
          </a>
        </div>
      </section>

      {/* Architecture Separation of Concerns */}
      <section className="border-y border-border bg-card/40 py-20 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Security Boundary
            </span>
            <h2 className="text-3xl font-semibold tracking-tight mt-2">
              The Three Responsibilities
            </h2>
            <p className="text-sm text-muted-foreground mt-3">
              An AI agent may request a payment. It must never be allowed to authorize itself.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-lg border border-border bg-background space-y-4">
              <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/40">
                <Cpu className="w-5 h-5 text-foreground" />
              </div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                01 / Intelligence
              </div>
              <h3 className="text-lg font-semibold tracking-tight">AI Agent Proposals</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Interprets PDF or text invoices, extracts structured line items, matches registered
                suppliers, and prepares verified payment requests via typed schema.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-lg border border-border bg-background space-y-4">
              <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/40">
                <ShieldCheck className="w-5 h-5 text-foreground" />
              </div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                02 / Authorization
              </div>
              <h3 className="text-lg font-semibold tracking-tight">Deterministic Policy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An isolated referee independently checks spending limits, per-transaction caps,
                supplier allowlists, and daily capacity. It signs an immutable audit receipt.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-lg border border-border bg-background space-y-4">
              <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/40">
                <Landmark className="w-5 h-5 text-foreground" />
              </div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                03 / Settlement
              </div>
              <h3 className="text-lg font-semibold tracking-tight">XRPL Multisigning</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Treasury requires 2-of-2 multisig (Agent + Policy). The ledger rejects any transaction
                lacking either signature, rendering rogue or prompt-injected payments impossible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Financial Guarantees */}
      <section className="py-20 px-8 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Guaranteed by Ledger & Cryptography
            </span>
            <h2 className="text-3xl font-semibold tracking-tight mt-2">
              Limits the agent cannot change
            </h2>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              In traditional agent setups, a compromised prompt or code flaw empties the whole
              treasury. Kitro moves enforcement outside the model context window:
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <span>
                  <strong>2-of-2 Quorum on Ledger:</strong> The agent holds one key. XRPL strictly
                  refuses transactions without the policy co-signature.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <span>
                  <strong>Cryptographically Signed Mandates:</strong> Changes to spending rules
                  require a signature from the operator&apos;s master key.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <span>
                  <strong>Verifiable Receipt Memo:</strong> Every validated transaction includes
                  the SHA-256 digest of the decision receipt directly in transaction memos.
                </span>
              </li>
            </ul>
          </div>

          <div className="border border-border rounded-lg bg-card p-6 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border text-muted-foreground">
              <span>xrpl-ledger-policy.json</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <pre className="text-muted-foreground leading-relaxed overflow-x-auto">
{`{
  "treasury": "rTreasuryAccount...",
  "signers": [
    { "account": "rAgentSigner...", "weight": 1 },
    { "account": "rPolicyReferee...", "weight": 1 }
  ],
  "quorum": 2,
  "dailyMaxDrops": "5000000",
  "perPaymentMaxDrops": "1000000",
  "requireApprovalAboveDrops": "500000",
  "enforcement": "XRPL_NATIVE_MULTISIG"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8 px-8 bg-card text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">KITRO</span>
            <span>— Policy-controlled autonomous treasury infrastructure for XRPL.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <a
              href="https://github.com/heyrapto/kitro"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
