"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  FileCheck2,
  Users,
  ShieldCheck,
  Receipt,
  Settings,
  FileText,
  Compass,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSavedWalletState, PREFUNDED_TESTNET_OPERATOR } from "@/lib/crossmark";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payments", href: "/dashboard/payments", icon: ArrowRightLeft },
  { label: "Approvals", href: "/dashboard/approvals", icon: FileCheck2 },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Suppliers", href: "/dashboard/suppliers", icon: Users },
  { label: "Policies & Limits", href: "/dashboard/policy", icon: ShieldCheck },
  { label: "Audit Receipts", href: "/dashboard/audit", icon: Receipt },
  { label: "Settings & MCP", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [operatorAddress, setOperatorAddress] = useState<string>(PREFUNDED_TESTNET_OPERATOR);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateWallet = () => {
      const state = getSavedWalletState();
      if (state.isConnected && state.address) {
        setOperatorAddress(state.address);
      }
    };
    updateWallet();
    window.addEventListener("kitro_wallet_changed", updateWallet);
    return () => window.removeEventListener("kitro_wallet_changed", updateWallet);
  }, []);

  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(operatorAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const truncatedAddress =
    operatorAddress.slice(0, 6) + "..." + operatorAddress.slice(-4);

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-foreground text-background flex items-center justify-center font-mono font-bold text-sm tracking-wider rounded">
            K
          </div>
          <div>
            <span className="font-semibold tracking-tight text-base block leading-none">KITRO</span>
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Autonomous Treasury
            </span>
          </div>
        </Link>

        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded bg-muted/40 border border-border/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider font-medium text-foreground">
              XRPL Testnet
            </span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">ALTNET</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 px-3 py-1">
          Treasury Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 px-3 py-1">
            Setup & Assistance
          </div>
          <Link
            href="/onboarding"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/70",
              pathname === "/onboarding" && "bg-foreground text-background font-medium",
            )}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Setup Wizard</span>
          </Link>
        </div>
      </nav>

      {/* Operator Wallet Pill & Footer Info */}
      <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground space-y-2.5">
        <div className="p-2 rounded bg-background border border-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wallet className="w-3 h-3 text-foreground" /> Operator
            </span>
            <button
              onClick={handleCopy}
              className="hover:text-foreground transition-colors hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="font-mono text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{truncatedAddress}</span>
            <a
              href={`https://testnet.xrpl.org/accounts/${operatorAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="Inspect on XRPL Explorer"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between font-mono text-[11px] px-1">
          <span>Multisig Quorum</span>
          <span className="font-semibold text-foreground">2-of-2</span>
        </div>
      </div>
    </aside>
  );
}
