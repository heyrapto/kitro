"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function MonoAddress({
  address,
  truncate = true,
  className,
}: {
  address: string;
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const display =
    truncate && address.length > 14
      ? `${address.slice(0, 7)}...${address.slice(-6)}`
      : address;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/80 select-all cursor-pointer hover:bg-muted transition-colors",
        className,
      )}
      onClick={handleCopy}
      title="Click to copy full address"
    >
      <span>{display}</span>
      {copied ? (
        <Check className="w-3 h-3 text-foreground" />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground opacity-60 hover:opacity-100" />
      )}
    </span>
  );
}
