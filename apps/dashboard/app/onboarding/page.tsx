"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Wallet,
  Building,
  Key,
  Sliders,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  connectCrossmark,
  connectDeveloperTestnet,
  isCrossmarkInstalled,
  getSavedWalletState,
  PREFUNDED_TESTNET_OPERATOR,
} from "@/lib/crossmark";

interface StepItem {
  id: number;
  name: string;
  shortDesc: string;
}

const STEPS: StepItem[] = [
  { id: 1, name: "Workspace Identity", shortDesc: "Define treasury workspace" },
  { id: 2, name: "Network Selection", shortDesc: "XRPL Testnet environment" },
  { id: 3, name: "Operator Wallet", shortDesc: "Connect signing identity" },
  { id: 4, name: "Treasury Account", shortDesc: "Review on-ledger treasury" },
  { id: 5, name: "Multisig Quorum", shortDesc: "2-of-2 authorized signers" },
  { id: 6, name: "Policy Mandate", shortDesc: "Spending caps & suppliers" },
  { id: 7, name: "Verification & Launch", shortDesc: "Ready for operations" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [workspaceName, setWorkspaceName] = useState("Acme Treasury Operations");
  const [operatorName, setOperatorName] = useState("Alice Morgan (Treasury Lead)");
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isCrossmarkAvail, setIsCrossmarkAvail] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // On-ledger status
  const [liveBalance, setLiveBalance] = useState<string>("100.00");
  const [liveDrops, setLiveDrops] = useState<string>("100000000");

  // Policy Mandate State
  const [perPaymentCap, setPerPaymentCap] = useState("1.00");
  const [dailyCap, setDailyCap] = useState("5.00");
  const [approvalThreshold, setApprovalThreshold] = useState("0.50");
  const [unknownPayeeRule, setUnknownPayeeRule] = useState("refuse");

  useEffect(() => {
    setIsCrossmarkAvail(isCrossmarkInstalled());
    const saved = getSavedWalletState();
    if (saved.isConnected && saved.address) {
      setConnectedAddress(saved.address);
    } else {
      // Default to prefunded address for convenience
      setConnectedAddress(PREFUNDED_TESTNET_OPERATOR);
    }

    // Fetch live treasury balance from API route
    fetch("/api/xrpl")
      .then((res) => res.json())
      .then((data) => {
        if (data.balanceXrp) setLiveBalance(data.balanceXrp);
        if (data.balanceDrops) setLiveDrops(data.balanceDrops);
      })
      .catch(() => {});
  }, []);

  const handleCrossmarkConnect = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const state = await connectCrossmark();
      setConnectedAddress(state.address);
    } catch (err: any) {
      setWalletError(err.message || "Failed to connect Crossmark");
    } finally {
      setWalletLoading(false);
    }
  };

  const handleDeveloperConnect = () => {
    const state = connectDeveloperTestnet();
    setConnectedAddress(state.address);
    setWalletError(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* Top Bar */}
      <header className="border-b border-border px-8 py-4 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur z-20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-foreground text-background flex items-center justify-center font-mono font-bold text-sm rounded">
            K
          </div>
          <div>
            <span className="font-semibold tracking-tight text-base block leading-none">KITRO</span>
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Treasury Setup Wizard
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Left Step Navigator */}
        <aside className="md:col-span-4 border-r border-border/60 pr-6 space-y-2 hidden md:block">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-4">
            Onboarding Checklist
          </div>
          {STEPS.map((step) => {
            const isDone = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                  isCurrent
                    ? "border-foreground bg-muted/60 font-medium"
                    : isDone
                      ? "border-border/60 bg-card hover:bg-muted/30"
                      : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-foreground" />
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-mono ${
                        isCurrent
                          ? "border-foreground bg-foreground text-background font-bold"
                          : "border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {step.id}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold">{step.name}</div>
                  <div className="text-[11px] text-muted-foreground">{step.shortDesc}</div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Step Content */}
        <main className="md:col-span-8 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Step 1: Workspace Identity */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Building className="w-3.5 h-3.5" /> Step 1: Identity
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Configure Treasury Workspace</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Establish your corporate treasury name and designated human operator identity.
                  </p>
                </div>

                <div className="space-y-4 border border-border p-6 rounded-lg bg-card">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Treasury Workspace Name
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-medium focus:outline-none focus:border-foreground"
                      placeholder="e.g. Acme Corp Treasury"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Designated Operator Name
                    </label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-medium focus:outline-none focus:border-foreground"
                      placeholder="e.g. Alice Morgan"
                    />
                  </div>

                  <div className="p-3 bg-muted/40 rounded border border-border/60 text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Operational Role:</span> The designated operator holds supervisory rights over the treasury mandate, approval escalations, and emergency pause controls.
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Network Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Layers className="w-3.5 h-3.5" /> Step 2: Network
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Select Settlement Network</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kitro operates on the XRP Ledger. For this hackathon evaluation, XRPL Testnet is active.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Testnet Card (Active) */}
                  <div className="p-5 rounded-lg border-2 border-foreground bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-foreground animate-pulse" />
                        <span className="font-semibold text-sm">XRPL Testnet (Active)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-foreground/30 bg-muted">
                        Public Altnet Cluster
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Full multi-signing support with real-time validated ledger consensus. Faucet funded accounts for zero-risk financial automation testing.
                    </p>
                    <div className="font-mono text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/60">
                      WebSocket: wss://s.altnet.rippletest.net:51233
                    </div>
                  </div>

                  {/* Mainnet Card (Disabled for safety) */}
                  <div className="p-5 rounded-lg border border-border/50 bg-muted/20 opacity-60 space-y-2 cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-muted-foreground">XRPL Mainnet</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        Coming After Security Audit (Q3 2026)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mainnet settlement is locked to prevent unintentional fund loss during prototype demonstration.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Operator Wallet */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Wallet className="w-3.5 h-3.5" /> Step 3: Wallet
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Connect Operator Wallet</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect an XRPL browser wallet or activate the pre-funded Testnet operator address.
                  </p>
                </div>

                <div className="space-y-4 border border-border p-6 rounded-lg bg-card">
                  {connectedAddress ? (
                    <div className="p-4 rounded border border-foreground/40 bg-muted/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-muted-foreground">Connected Operator Address</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-foreground text-background">Connected</span>
                      </div>
                      <div className="font-mono text-sm font-semibold break-all text-foreground">
                        {connectedAddress}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Crossmark Option */}
                    <button
                      onClick={handleCrossmarkConnect}
                      disabled={walletLoading}
                      className="p-4 rounded border border-border bg-background hover:bg-muted text-left transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm">Crossmark Browser Wallet</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {isCrossmarkAvail ? "Extension detected in browser" : "Extension not detected (click to retry)"}
                        </div>
                      </div>
                      <div className="mt-4 text-xs font-medium text-foreground inline-flex items-center gap-1">
                        <span>{walletLoading ? "Connecting..." : "Connect Extension"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Developer Pre-Funded Option */}
                    <button
                      onClick={handleDeveloperConnect}
                      className="p-4 rounded border-2 border-foreground bg-muted/40 text-left transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">Pre-Funded Testnet Treasury</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-foreground text-background rounded">
                            Recommended
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Uses pre-funded on-ledger account with 100 XRP and verified multisig configuration.
                        </div>
                      </div>
                      <div className="mt-4 text-xs font-medium text-foreground inline-flex items-center gap-1">
                        <span>Activate Fast-Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </div>

                  {walletError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
                      {walletError}
                    </div>
                  )}

                  <div className="p-3 rounded border border-border/80 bg-background text-[11px] text-muted-foreground flex items-start gap-2">
                    <Lock className="w-4 h-4 shrink-0 text-foreground mt-0.5" />
                    <span>
                      <strong className="text-foreground">Zero Custody Guarantee:</strong> Kitro never asks for, stores, or handles your private keys in the browser client. All approvals follow cryptographic delegation.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Treasury Account Details */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Shield className="w-3.5 h-3.5" /> Step 4: Treasury
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">On-Ledger Treasury Account</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the verified live on-ledger state of the primary treasury vault.
                  </p>
                </div>

                <div className="border border-border rounded-lg bg-card p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded bg-background border border-border space-y-1">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Treasury Classic Address</div>
                      <div className="font-mono text-xs font-semibold break-all text-foreground">
                        {PREFUNDED_TESTNET_OPERATOR}
                      </div>
                    </div>
                    <div className="p-4 rounded bg-background border border-border space-y-1">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">Live Testnet Balance</div>
                      <div className="text-2xl font-semibold font-mono tracking-tight text-foreground">
                        {liveBalance} <span className="text-xs font-sans text-muted-foreground">XRP</span>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        ({liveDrops} drops)
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded bg-muted/30 border border-border/60 space-y-2">
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>Reserve Breakdown</span>
                      <span className="text-[11px] font-mono text-muted-foreground">XRPL Protocol Standard</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                      <div>Base Account Reserve: <span className="text-foreground">10.00 XRP</span></div>
                      <div>SignerList Object Reserve: <span className="text-foreground">2.00 XRP</span></div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <a
                      href={`https://testnet.xrpl.org/accounts/${PREFUNDED_TESTNET_OPERATOR}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline text-foreground"
                    >
                      <span>Inspect Treasury on XRPL Explorer</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Multisig Quorum */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Key className="w-3.5 h-3.5" /> Step 5: Multi-Signing
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">2-of-2 Multisig Architecture</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transactions require signatures from both the AI Execution Agent and the Policy Referee.
                  </p>
                </div>

                <div className="border border-border rounded-lg bg-card p-6 space-y-5">
                  <div className="p-3 bg-muted/40 rounded border border-border/80 flex items-center justify-between">
                    <span className="text-xs font-semibold">SignerListSet Status</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-foreground text-background">
                      Confirmed On-Ledger (Quorum 2)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Signer 1: Agent */}
                    <div className="p-4 rounded border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Signer 1: AI Execution Agent</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">Weight 1</span>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground break-all">
                        rH3Gng7Nz9JhGPPpjjbDoQBATSDWjaEZSc
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Signs payment proposals generated from approved invoice extractions.
                      </div>
                    </div>

                    {/* Signer 2: Policy */}
                    <div className="p-4 rounded border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Signer 2: Policy Referee</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">Weight 1</span>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground break-all">
                        r4sML1TA1mqjEbtEBJ1PfwWNs9yy2djyNn
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Co-signs strictly when all spending limits and allowlists evaluate to allow.
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/30 rounded border border-border/60 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Mathematical Guarantee:</span> If an AI agent attempts to execute an unauthorized payment, XRPL consensus immediately rejects the transaction with code <code className="font-mono text-foreground">tefBAD_QUORUM</code>.
                  </div>

                  <div className="p-3 bg-muted/20 rounded border border-border/70 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Security Governance: </span>
                    Routine agent-initiated payments require both the agent signer and independent policy signer. The treasury operator retains a separate master-key recovery capability in the current Testnet configuration.
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Policy Mandate */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Sliders className="w-3.5 h-3.5" /> Step 6: Policies
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Configure Spending Mandate</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set deterministic spending limits and pre-approved supplier payees.
                  </p>
                </div>

                <div className="border border-border rounded-lg bg-card p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                        Per-Payment Cap (XRP)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={perPaymentCap}
                        onChange={(e) => setPerPaymentCap(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono font-medium focus:outline-none focus:border-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                        24-Hour Rolling Cap (XRP)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={dailyCap}
                        onChange={(e) => setDailyCap(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono font-medium focus:outline-none focus:border-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                        Approval Threshold (XRP)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={approvalThreshold}
                        onChange={(e) => setApprovalThreshold(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded text-sm font-mono font-medium focus:outline-none focus:border-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                      Approved Test Supplier
                    </label>
                    <div className="p-3 bg-background border border-border rounded flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold">Reliable Cloud Services Ltd</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border">
                        Pre-Approved Payee
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded border border-border/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold block">Unknown Payee Handling</span>
                      <span className="text-muted-foreground">Invoices from unregistered addresses</span>
                    </div>
                    <select
                      value={unknownPayeeRule}
                      onChange={(e) => setUnknownPayeeRule(e.target.value)}
                      className="font-mono font-bold uppercase text-foreground bg-background px-2.5 py-1 rounded border border-border text-xs"
                    >
                      <option value="refuse">REFUSE (STRICT)</option>
                      <option value="escrow">ESCROW (HOLD)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Verification & Launch */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> Step 7: Ready
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Treasury Ready for Operations</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    All security boundaries, on-ledger multi-signing, and spending mandates are verified.
                  </p>
                </div>

                <div className="border border-border rounded-lg bg-card p-6 space-y-4">
                  <div className="space-y-2.5">
                    {[
                      { label: "Workspace & Operator Defined", value: `${workspaceName} (${operatorName})` },
                      { label: "Network Active", value: "XRPL Testnet (s.altnet.rippletest.net)" },
                      { label: "Operator Wallet Connected", value: connectedAddress || PREFUNDED_TESTNET_OPERATOR },
                      { label: "Treasury Account Live", value: `${liveBalance} XRP Available` },
                      { label: "2-of-2 Multisigning Confirmed", value: "Quorum 2 (Agent + Policy Referee)" },
                      { label: "Spending Mandate Active", value: `Cap ${perPaymentCap} XRP / Daily ${dailyCap} XRP` },
                      { label: "Allowlisted Supplier", value: "Reliable Cloud Services Ltd (rwVrs...)" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded bg-background border border-border/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-border">
                    <span className="text-xs text-muted-foreground font-mono">
                      Ready to process live invoices and payments
                    </span>
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded bg-foreground text-background font-medium text-xs hover:opacity-90 transition-opacity"
                    >
                      <span>Open My Treasury</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Step Actions */}
          <div className="flex items-center justify-between pt-8 border-t border-border mt-8">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium border border-border bg-card hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {currentStep < 7 ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(7, prev + 1))}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-1.5 px-6 py-2 rounded text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <span>Launch Treasury</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
