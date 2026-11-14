"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import {
  Terminal,
  Shield,
  Key,
  Copy,
  Check,
  Bot,
} from "lucide-react";

export default function SettingsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyConfig = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const antigravityJson = `{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--filter", "@kitro/mcp", "start"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787"
      }
    }
  }
}`;

  const claudeDesktopJson = `{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--filter", "@kitro/mcp", "start"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787"
      }
    }
  }
}`;

  const MCP_TOOLS = [
    {
      name: "get_treasury_status",
      description: "Retrieve real-time XRPL reserve balance, 2-of-2 multisig quorum, and daily spending capacity.",
      input: "None",
      samplePrompt: '"What is our current Kitro treasury balance and remaining daily capacity?"',
    },
    {
      name: "get_spending_policy",
      description: "Retrieve active mandate limits (single transaction cap, daily cap, approval threshold).",
      input: "None",
      samplePrompt: '"Show me the active Kitro treasury spending mandate and limits."',
    },
    {
      name: "list_suppliers",
      description: "List verified and allowlisted supplier addresses on the treasury registry.",
      input: "None",
      samplePrompt: '"List all approved suppliers configured in Kitro."',
    },
    {
      name: "list_payment_requests",
      description: "List recent payment requests with optional status filter (received, held, approved, refused).",
      input: "status?: string",
      samplePrompt: '"Show me all recent payment proposals submitted to Kitro."',
    },
    {
      name: "get_payment_status",
      description: "Get real-time evaluation, authorization, and XRPL ledger settlement status for a request.",
      input: "requestId: string",
      samplePrompt: '"What is the ledger settlement status of request req-live-001?"',
    },
    {
      name: "read_invoice",
      description: "Parse raw invoice text or document string to extract vendor, amounts, dates, and destination.",
      input: "invoiceText: string",
      samplePrompt: '"Parse this invoice text and tell me what needs to be paid."',
    },
    {
      name: "list_pending_approvals",
      description: "List payment requests held by the policy referee that require human operator authorization.",
      input: "None",
      samplePrompt: '"Are there any payments currently waiting for human approval?"',
    },
    {
      name: "get_audit_receipt",
      description: "Fetch cryptographic audit receipt with canonical policy hash and referee signature.",
      input: "requestId: string",
      samplePrompt: '"Retrieve the signed audit receipt for request req-live-001."',
    },
    {
      name: "request_payment",
      description: "Submit an invoice payment request to the policy referee for deterministic evaluation.",
      input: "invoiceId, destinationAddress, amountDrops",
      samplePrompt: '"Submit a payment request for invoice INV-101 to r3N64... for 350,000 drops."',
    },
  ];

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header
        title="Settings & MCP Integration"
        subtitle="Network topology, Model Context Protocol configurations, and AI client connectivity"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        {/* On-Ledger Accounts & Network Topology */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Shield className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">XRPL Testnet Infrastructure</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Network Node URL</span>
              <span className="text-foreground">wss://s.altnet.rippletest.net:51233</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Network Identifier</span>
              <span className="text-foreground">xrpl:testnet (Public Altnet Cluster)</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Treasury Vault (Operator)</span>
              <span className="text-foreground break-all">rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Multisig Quorum (On-Ledger)</span>
              <span className="text-foreground font-semibold">2 of 2 (Quorum: 2, SignerListSet Confirmed)</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Agent Signer (Weight 1)</span>
              <span className="text-foreground break-all">rH3Gng7Nz9JhGPPpjjbDoQBATSDWjaEZSc</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Policy Signer (Weight 1)</span>
              <span className="text-foreground break-all">r4sML1TA1mqjEbtEBJ1PfwWNs9yy2djyNn</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-muted-foreground block text-[10px] uppercase">Allowlisted Supplier</span>
              <span className="text-foreground break-all">rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze (Reliable Cloud Services Ltd)</span>
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded border border-border/80 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Security Governance Statement: </span>
            Routine agent-initiated payments require both the agent signer and independent policy signer. The treasury operator retains a separate master-key recovery capability in the current Testnet configuration.
          </div>
        </div>

        {/* Google Antigravity Integration */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-foreground" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Google Antigravity MCP Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save in <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded text-[11px]">.agents/mcp_config.json</code>
                </p>
              </div>
            </div>

            <button
              onClick={() => copyConfig(antigravityJson, "antigravity")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-xs hover:bg-muted font-sans cursor-pointer"
            >
              {copiedSection === "antigravity" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Config</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded bg-background border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
            {antigravityJson}
          </pre>
        </div>

        {/* Claude Desktop Configuration */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-foreground" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Claude Desktop MCP Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save in <code className="font-mono text-foreground bg-muted px-1 py-0.5 rounded text-[11px]">%APPDATA%\Claude\claude_desktop_config.json</code>
                </p>
              </div>
            </div>

            <button
              onClick={() => copyConfig(claudeDesktopJson, "claude")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-xs hover:bg-muted font-sans cursor-pointer"
            >
              {copiedSection === "claude" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Config</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded bg-background border border-border font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
            {claudeDesktopJson}
          </pre>
        </div>

        {/* Remote HTTP & SSE MCP Endpoint */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Key className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Remote HTTP & Streamable SSE MCP Service</h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">HTTP JSON-RPC Endpoint</span>
                <span className="text-foreground font-semibold">http://localhost:3001/mcp</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">SSE Stream Transport</span>
                <span className="text-foreground font-semibold">http://localhost:3001/sse</span>
              </div>
            </div>
            <div className="p-3 bg-muted/40 rounded border border-border text-[11px] font-sans text-muted-foreground">
              Launch HTTP transport with: <code className="font-mono text-foreground">pnpm --filter @kitro/mcp run start:http</code>
            </div>
          </div>
        </div>

        {/* MCP Tools Catalog */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-semibold tracking-tight">Registered MCP Tools (9 Available)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available to any connected AI assistant (Antigravity, Claude, ChatGPT)
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className="py-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-foreground text-[13px]">{tool.name}</span>
                  <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {tool.input}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{tool.description}</p>
                <div className="text-[11px] font-mono text-foreground/80 bg-muted/30 p-2 rounded border border-border/50">
                  <span className="text-muted-foreground">Sample Query: </span>
                  {tool.samplePrompt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
