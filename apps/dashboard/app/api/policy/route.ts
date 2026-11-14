import { NextResponse } from "next/server";
import { evaluate, type Decision, type State } from "@kitro/rules";
import type { Mandate } from "@kitro/core";

// Default active mandate matching testnet environment
const DEFAULT_MANDATE: Mandate = {
  version: 1,
  operator: process.env.OPERATOR_ADDRESS || "rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk",
  network: "xrpl:testnet",
  treasury: process.env.TREASURY_ADDRESS || "rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk",
  paused: false,
  perPaymentMaxDrops: "1000000", // 1 XRP cap
  dailyMaxDrops: "5000000",      // 5 XRP cap
  requireApprovalAboveDrops: "500000", // 0.5 XRP requires human approval
  newPayeeRoute: "refuse",
  escrowMaxLockSeconds: 86400,
  issuedAt: "2026-11-13T00:00:00.000Z",
  payees: [
    {
      address: process.env.SUPPLIER_ADDRESS || "rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze",
      name: "Reliable Cloud Services Ltd",
      route: "payment",
    },
  ],
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const payee = body.payee?.trim() || "";
    const amountDrops = String(body.amountDrops || "1000000");
    const spentTodayDrops = BigInt(body.spentTodayDrops || "0");
    const invoiceSeen = Boolean(body.invoiceSeen);
    const addressChanged = Boolean(body.addressChanged);

    // Try live policy service first if reachable
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || "http://localhost:8787";
    try {
      const res = await fetch(`${policyServiceUrl}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payee,
          amountDrops,
          invoiceId: body.invoiceId,
        }),
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          source: "policy-service",
          ...data,
        });
      }
    } catch {
      // Fall through to deterministic evaluation
    }

    const state: State = {
      spentTodayDrops,
      invoiceSeen,
      addressChanged,
    };

    const decision: Decision = evaluate(DEFAULT_MANDATE, { payee, amountDrops }, state);

    return NextResponse.json({
      source: "local-evaluator",
      decision,
      mandate: {
        perPaymentMaxDrops: DEFAULT_MANDATE.perPaymentMaxDrops,
        dailyMaxDrops: DEFAULT_MANDATE.dailyMaxDrops,
        requireApprovalAboveDrops: DEFAULT_MANDATE.requireApprovalAboveDrops,
        approvedPayeesCount: DEFAULT_MANDATE.payees.length,
      },
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to evaluate policy" },
      { status: 400 },
    );
  }
}
