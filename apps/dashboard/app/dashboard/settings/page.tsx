"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Terminal, Shield, Key, Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyConfig = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const stdioJson = `{
  "mcpServers": {
    "kitro": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787",
        "KITRO_MCP_TOKEN": "kitro-mcp-secret-token"
      }
    }
  }
}`;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Settings & MCP Integration"
        subtitle="Network topology, model context protocol endpoints, and security credentials"
      />

      <main className="p-8 space-y-8 flex-1 overflow-y-auto max-w-7xl">
        {/* Network & Ledger Configuration */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Shield className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">XRPL Ledger Environment</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Network Node URL</span>
              <span className="text-foreground">wss://s.altnet.rippletest.net:51233</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Network Identifier</span>
              <span className="text-foreground">xrpl:1 (Testnet Only)</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Multisig Quorum</span>
              <span className="text-foreground font-semibold">2 of 2 (Agent + Policy Required)</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Transaction Type</span>
              <span className="text-foreground">PaymentChannel, Payment (Multisig), Escrow</span>
            </div>
          </div>
        </div>

        {/* Local STDIO MCP Configuration */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-foreground" />
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Model Context Protocol (MCP) — Local STDIO</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect Google Antigravity or Claude Desktop directly to Kitro
                </p>
              </div>
            </div>

            <button
              onClick={() => copyConfig(stdioJson, "stdio")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-border text-xs hover:bg-muted font-sans cursor-pointer"
            >
              {copiedSection === "stdio" ? (
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

          <p className="text-xs text-muted-foreground leading-relaxed">
            Add this configuration block to your MCP client settings (e.g.{" "}
            <code className="text-foreground bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">
              claude_desktop_config.json
            </code>{" "}
            or Antigravity MCP settings).
          </p>

          <pre className="p-4 rounded bg-background border border-border font-mono text-xs text-muted-foreground overflow-x-auto leading-relaxed">
            {stdioJson}
          </pre>
        </div>

        {/* Remote Streamable HTTP MCP */}
        <div className="p-6 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Key className="w-4 h-4 text-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">Remote HTTP MCP Endpoint</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Base URL</span>
              <span className="text-foreground">https://api.kitro.finance/mcp</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Transport</span>
              <span className="text-foreground">Streamable HTTP (POST /mcp)</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Available Tools</span>
              <span className="text-foreground">
                get_treasury_status, get_spending_policy, list_suppliers, list_payment_requests,
                get_payment_status, read_invoice, list_pending_approvals, get_audit_receipt, request_payment
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
