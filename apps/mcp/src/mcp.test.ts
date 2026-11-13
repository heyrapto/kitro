import { describe, expect, it, vi } from "vitest";
import { McpServer } from "./server.js";
import { MCP_TOOLS } from "./tools.js";
import type { KitroClient } from "@kitro/client";

describe("Kitro MCP Server", () => {
  it("has exactly 9 operational tools defined", () => {
    expect(MCP_TOOLS).toHaveLength(9);
    const names = MCP_TOOLS.map((t) => t.name);
    expect(names).toContain("get_treasury_status");
    expect(names).toContain("get_spending_policy");
    expect(names).toContain("list_suppliers");
    expect(names).toContain("list_payment_requests");
    expect(names).toContain("get_payment_status");
    expect(names).toContain("read_invoice");
    expect(names).toContain("list_pending_approvals");
    expect(names).toContain("get_audit_receipt");
    expect(names).toContain("request_payment");
  });

  it("handles initialize method correctly", async () => {
    const server = new McpServer();
    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    });

    expect(res).toBeDefined();
    expect(res?.result.protocolVersion).toBe("2024-11-05");
    expect(res?.result.serverInfo.name).toBe("kitro-mcp-server");
    expect(res?.result.capabilities.tools).toBeDefined();
  });

  it("handles ping method", async () => {
    const server = new McpServer();
    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "ping",
    });

    expect(res).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: {},
    });
  });

  it("lists all tools with schemas via tools/list", async () => {
    const server = new McpServer();
    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });

    expect(res?.result.tools).toHaveLength(9);
    const reqTool = res?.result.tools.find((t: any) => t.name === "request_payment");
    expect(reqTool).toBeDefined();
    expect(reqTool.inputSchema.required).toEqual(["invoiceId", "destinationAddress", "amountDrops"]);
  });

  it("executes read_invoice deterministically", async () => {
    const server = new McpServer();
    const rawInvoice = `Acme Cloud Services Ltd
Invoice Number: INV-98421
Destination: rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh
Total Due: 25.5 XRP
Due Date: 2026-12-01`;

    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "read_invoice",
        arguments: {
          invoiceText: rawInvoice,
        },
      },
    });

    expect(res?.result.isError).toBeFalsy();
    const parsed = JSON.parse(res?.result.content[0].text);
    expect(parsed.invoiceId).toBe("INV-98421");
    expect(parsed.supplierName).toBe("Acme Cloud Services Ltd");
    expect(parsed.payee).toBe("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
    expect(parsed.amountDrops).toBe("25500000");
  });

  it("delegates request_payment to policy service without self-authorizing", async () => {
    const mockClient = {
      requestPayment: vi.fn().mockResolvedValue({
        id: "mock-req-123",
        status: "held",
        decision: {
          outcome: "hold",
          reasons: ["AMOUNT_EXCEEDS_AUTO_APPROVAL"],
        },
        receipt: {
          receipt: { requestId: "mock-req-123", outcome: "hold" },
          publicKey: "ED...",
          signature: "SIG...",
        },
      }),
    } as unknown as KitroClient;

    const server = new McpServer(mockClient);

    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "request_payment",
        arguments: {
          invoiceId: "INV-999",
          destinationAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
          amountDrops: "5000000",
        },
      },
    });

    expect(mockClient.requestPayment).toHaveBeenCalledWith({
      invoiceId: "INV-999",
      payee: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      amountDrops: "5000000",
    });

    expect(res?.result.isError).toBeFalsy();
    const parsed = JSON.parse(res?.result.content[0].text);
    expect(parsed.status).toBe("held");
    expect(parsed.outcome).toBe("hold");
    expect(parsed.reasons).toContain("AMOUNT_EXCEEDS_AUTO_APPROVAL");
    expect(parsed.explanation).toContain("requires human operator approval");
  });

  it("returns error for unknown tool", async () => {
    const server = new McpServer();
    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "unknown_magic_tool",
        arguments: {},
      },
    });

    expect(res?.result.isError).toBe(true);
    expect(res?.result.content[0].text).toContain("Unknown MCP tool");
  });
});
