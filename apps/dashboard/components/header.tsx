"use client";

import { useState } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { MonoAddress } from "./mono-address";

export function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [operatorAddress, setOperatorAddress] = useState<string>(
    () => (typeof window !== "undefined" ? localStorage.getItem("kitro_operator") || "" : ""),
  );

  const connectWallet = () => {
    // Demo wallet connection prompt
    const addr = window.prompt(
      "Enter Operator XRPL Testnet Address (starts with 'r'):",
      operatorAddress || "rOperatorAddressExample1234567890",
    );
    if (addr && addr.trim().startsWith("r")) {
      setOperatorAddress(addr.trim());
      localStorage.setItem("kitro_operator", addr.trim());
    }
  };

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur px-8 py-5 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {operatorAddress ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Operator:</span>
            <MonoAddress address={operatorAddress} />
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Connect Operator Wallet</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-l border-border pl-4">
          <ShieldAlert className="w-3.5 h-3.5 text-foreground" />
          <span>Independent Referee Active</span>
        </div>
      </div>
    </header>
  );
}
