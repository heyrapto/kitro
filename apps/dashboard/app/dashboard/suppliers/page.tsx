"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { MonoAddress } from "@/components/mono-address";
import { StatusBadge } from "@/components/status-badge";
import { Users, Plus, UserCheck, ShieldCheck } from "lucide-react";

type Supplier = {
  address: string;
  name: string;
  route: "channel" | "payment";
  tag?: number;
};

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    name: "Apex Cloud Infrastructure Ltd.",
    route: "payment",
  },
  {
    address: "rSupplierBAddress12345678901234567",
    name: "Global Fiber Bandwidth Corp",
    route: "payment",
  },
  {
    address: "rChannelVendorAddress998877665544",
    name: "FastPack Logistics Services",
    route: "channel",
  },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [route, setRoute] = useState<"channel" | "payment">("payment");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:8787/suppliers");
        if (res.ok) {
          const data = await res.json();
          if (data.suppliers && data.suppliers.length > 0) {
            setSuppliers(data.suppliers);
          }
        }
      } catch {
        // fallback
      }
    }
    load();
  }, []);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address.startsWith("r")) return;

    const newSupplier: Supplier = {
      address: address.trim(),
      name: name.trim(),
      route,
    };

    setSuppliers((prev) => [...prev, newSupplier]);
    setName("");
    setAddress("");
    setIsAdding(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Authorized Suppliers"
        subtitle="Allowlisted corporate payees configured in the treasury mandate"
      />

      <main className="p-8 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-foreground" />
            <span>Unknown payees are blocked or routed to escrow per policy rules.</span>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        </div>

        {/* Add Supplier Modal / Drawer */}
        {isAdding && (
          <form
            onSubmit={handleAddSupplier}
            className="p-6 rounded-lg border border-border bg-card space-y-4 max-w-lg"
          >
            <h3 className="text-sm font-semibold tracking-tight">Register Approved Supplier</h3>

            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Legal Entity Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Cloud Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2 bg-background border border-border rounded text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                XRPL Classic Address (r-address)
              </label>
              <input
                type="text"
                placeholder="r..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full p-2 bg-background border border-border rounded font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Settlement Route
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value as any)}
                className="w-full p-2 bg-background border border-border rounded text-xs"
              >
                <option value="payment">Direct 2-of-2 Multisig Payment</option>
                <option value="channel">Budget Payment Channel</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-foreground text-background text-xs font-medium"
              >
                Save to Allowlist
              </button>
            </div>
          </form>
        )}

        {/* Suppliers Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Supplier Entity</th>
                <th className="py-3 px-4">XRPL Address</th>
                <th className="py-3 px-4">Settlement Route</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((s) => (
                <tr key={s.address} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-xs flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-foreground/70" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <MonoAddress address={s.address} />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs uppercase text-muted-foreground">
                    {s.route}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status="approved" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
