import { KitroClient } from "@kitro/client";
import type { PaymentRequest } from "@kitro/core";
import type { McpToolDefinition, McpToolResult } from "./types.js";

export function logAudit(toolName: string, args: unknown, outcome: "success" | "error", details?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: "mcp_tool_invocation",
    tool: toolName,
    outcome,
    arguments: args,
    details,
  };
  process.stderr.write(`[KITRO-MCP-AUDIT] ${JSON.stringify(entry)}\n`);
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "get_treasury_status",
    description:
      "Retrieve the real-time status of the Kitro XRPL Treasury, including reserve balance, signer list quorum, active signers, and daily spend capacity.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_spending_policy",
    description:
      "Retrieve the active spending mandate rules, single transaction limit, daily aggregate limit, auto-approval threshold, and approved destination policies.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_suppliers",
    description: "List all approved and verified supplier addresses on the treasury allowlist.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_payment_requests",
    description:
      "List recent payment requests submitted to the treasury, with optional status filter (received, held, approved, refused).",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional filter: received, held, approved, or refused",
          enum: ["received", "held", "approved", "refused"],
        },
      },
    },
  },
  {
    name: "get_payment_status",
    description:
      "Get the real-time evaluation, authorization, and XRPL ledger settlement status of a specific payment request.",
    inputSchema: {
      type: "object",
      properties: {
        requestId: {
          type: "string",
          description: "The Kitro payment request UUID",
        },
      },
      required: ["requestId"],
    },
  },
  {
    name: "read_invoice",
    description:
      "Parse invoice raw text or document string to extract vendor, amounts, dates, and payment destination details.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceText: {
          type: "string",
          description: "Raw text content of the invoice",
        },
      },
      required: ["invoiceText"],
    },
  },
  {
    name: "list_pending_approvals",
    description:
      "List payment requests held by the policy referee that require human operator authorization.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_audit_receipt",
    description:
      "Fetch the cryptographic audit receipt for an evaluated payment request, including canonical policy hash, evaluation timestamp, and referee signature.",
    inputSchema: {
      type: "object",
      properties: {
        requestId: {
          type: "string",
          description: "The Kitro payment request UUID",
        },
      },
      required: ["requestId"],
    },
  },
  {
    name: "request_payment",
    description:
      "Submit an invoice payment request to the Kitro policy service. Evaluated deterministically against treasury rules. An AI agent may request a payment, but it can never authorize itself.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceId: {
          type: "string",
          description: "Unique invoice reference number (e.g. INV-2026-001)",
        },
        destinationAddress: {
          type: "string",
          description: "Supplier's XRPL address (e.g. rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh)",
        },
        amountDrops: {
          type: "string",
          description: "Payment amount in drops (1 XRP = 1,000,000 drops)",
        },
        memo: {
          type: "string",
          description: "Optional payment memo / reason description",
        },
      },
      required: ["invoiceId", "destinationAddress", "amountDrops"],
    },
  },
];

export async function executeMcpTool(
  toolName: string,
  args: Record<string, any> = {},
  client: KitroClient = new KitroClient(),
): Promise<McpToolResult> {
  try {
    switch (toolName) {
      case "get_treasury_status": {
        const treasury = await client.getTreasury();
        logAudit(toolName, args, "success", { treasuryAddress: treasury.treasuryAddress });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(treasury, null, 2),
            },
          ],
        };
      }

      case "get_spending_policy": {
        const mandate = await client.getMandate();
        if (!mandate) {
          logAudit(toolName, args, "error", "No active mandate");
          return {
            content: [{ type: "text", text: "No active spending mandate found on the treasury." }],
            isError: true,
          };
        }
        logAudit(toolName, args, "success", { version: mandate.mandate.version });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(mandate, null, 2),
            },
          ],
        };
      }

      case "list_suppliers": {
        const data = await client.getSuppliers();
        logAudit(toolName, args, "success", { count: data.suppliers.length });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data.suppliers, null, 2),
            },
          ],
        };
      }

      case "list_payment_requests": {
        const requests = await client.listRequests(args.status);
        logAudit(toolName, args, "success", { count: requests.length, filter: args.status });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(requests, null, 2),
            },
          ],
        };
      }

      case "get_payment_status": {
        const { requestId } = args;
        if (!requestId || typeof requestId !== "string") {
          return {
            content: [{ type: "text", text: "Error: requestId (string) is required." }],
            isError: true,
          };
        }
        const request = await client.getRequest(requestId);
        logAudit(toolName, args, "success", { requestId, status: request.status });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(request, null, 2),
            },
          ],
        };
      }

      case "read_invoice": {
        const { invoiceText } = args;
        if (!invoiceText || typeof invoiceText !== "string") {
          return {
            content: [{ type: "text", text: "Error: invoiceText (string) is required." }],
            isError: true,
          };
        }

        // Deterministic extraction
        const invMatch = /\bINV-[A-Z0-9-]+\b/i.exec(invoiceText) ?? /Invoice\s*(?:#|Number)?[:\s]+([A-Z0-9-]+)/i.exec(invoiceText);
        const invoiceId = invMatch ? (invMatch[1] ?? invMatch[0]).trim() : `INV-${Date.now().toString().slice(-6)}`;

        const addrMatch = /r[1-9A-HJ-NP-Za-km-z]{24,34}/.exec(invoiceText);
        const payee = addrMatch ? addrMatch[0] : null;

        const xrpMatch = /([\d,]+(?:\.\d+)?)\s*(?:XRP|xrp)/.exec(invoiceText);
        const dropsMatch = /([\d,]+)\s*(?:drops|DROPS)/.exec(invoiceText);

        let amountDrops = "0";
        if (dropsMatch && dropsMatch[1]) {
          amountDrops = dropsMatch[1].replace(/,/g, "");
        } else if (xrpMatch && xrpMatch[1]) {
          const val = parseFloat(xrpMatch[1].replace(/,/g, ""));
          amountDrops = Math.round(val * 1000000).toString();
        }

        const lines = invoiceText.split("\n").map((l) => l.trim()).filter(Boolean);
        const supplierName = lines.length > 0 ? lines[0] : "Unknown Supplier";

        const extracted = {
          invoiceId,
          supplierName,
          payee,
          amountDrops,
          estimatedXrp: (parseInt(amountDrops, 10) / 1000000).toFixed(6),
          rawLength: invoiceText.length,
        };

        logAudit(toolName, args, "success", { invoiceId, payee, amountDrops });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(extracted, null, 2),
            },
          ],
        };
      }

      case "list_pending_approvals": {
        const held = await client.listRequests("held");
        logAudit(toolName, args, "success", { count: held.length });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(held, null, 2),
            },
          ],
        };
      }

      case "get_audit_receipt": {
        const { requestId } = args;
        if (!requestId || typeof requestId !== "string") {
          return {
            content: [{ type: "text", text: "Error: requestId (string) is required." }],
            isError: true,
          };
        }
        const request = await client.getRequest(requestId);
        if (!request.receipt) {
          logAudit(toolName, args, "error", "No receipt attached to request");
          return {
            content: [{ type: "text", text: `No cryptographic audit receipt found for request ${requestId}.` }],
            isError: true,
          };
        }
        logAudit(toolName, args, "success", { requestId });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(request.receipt, null, 2),
            },
          ],
        };
      }

      case "request_payment": {
        const { invoiceId, destinationAddress, amountDrops, memo } = args;
        if (!invoiceId || !destinationAddress || !amountDrops) {
          return {
            content: [
              {
                type: "text",
                text: "Error: invoiceId, destinationAddress, and amountDrops are required fields.",
              },
            ],
            isError: true,
          };
        }

        const paymentRequest: PaymentRequest = {
          invoiceId: String(invoiceId),
          payee: String(destinationAddress),
          amountDrops: String(amountDrops),
          ...(memo ? { memo: String(memo) } : {}),
        };

        // Submit to policy service referee
        const decisionResponse = await client.requestPayment(paymentRequest);

        logAudit(toolName, args, "success", {
          requestId: decisionResponse.id,
          status: decisionResponse.status,
          outcome: decisionResponse.decision.outcome,
        });

        let explanation = "";
        if (decisionResponse.decision.outcome === "allow") {
          explanation =
            "Payment request evaluated and ALLOWED by policy referee. Meets all spending caps, allowlist checks, and auto-approval limits. Awaiting 2-of-2 multisignature co-signing.";
        } else if (decisionResponse.decision.outcome === "hold") {
          explanation =
            "Payment request HELD by policy referee. Transaction requires human operator approval before signing (exceeds auto-approval limit or destination requires review).";
        } else {
          explanation = `Payment request REFUSED by policy referee. Violation reasons: ${
            decisionResponse.decision.reasons?.join(", ") ?? "Policy breach"
          }. Signed refusal receipt generated.`;
        }

        const resultPayload = {
          requestId: decisionResponse.id,
          status: decisionResponse.status,
          outcome: decisionResponse.decision.outcome,
          reasons: decisionResponse.decision.reasons ?? [],
          explanation,
          receipt: decisionResponse.receipt,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(resultPayload, null, 2),
            },
          ],
        };
      }

      default:
        logAudit(toolName, args, "error", "Unknown tool");
        return {
          content: [{ type: "text", text: `Unknown MCP tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logAudit(toolName, args, "error", errorMsg);
    return {
      content: [{ type: "text", text: `Tool execution failed: ${errorMsg}` }],
      isError: true,
    };
  }
}
