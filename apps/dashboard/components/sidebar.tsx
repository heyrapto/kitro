"use client";

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
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payments", href: "/dashboard/payments", icon: ArrowRightLeft },
  { label: "Approvals", href: "/dashboard/approvals", icon: FileCheck2 },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Suppliers", href: "/dashboard/suppliers", icon: Users },
  { label: "Policy & Limits", href: "/dashboard/policy", icon: ShieldCheck },
  { label: "Audit Receipts", href: "/dashboard/audit", icon: Receipt },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-border">
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

        <div className="mt-4 flex items-center gap-2 px-2 py-1 rounded bg-muted/50 border border-border/60">
          <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            XRPL Testnet
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 px-3 py-1.5">
          Treasury Controls
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
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-muted/20 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span>Quorum</span>
          <span className="font-semibold text-foreground">2-of-2 multisig</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span>Ledger</span>
          <a
            href="https://testnet.xrpl.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline text-foreground"
          >
            <span>Explorer</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </aside>
  );
}
