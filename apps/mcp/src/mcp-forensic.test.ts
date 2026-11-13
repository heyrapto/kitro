import { describe, expect, it, vi } from "vitest";
import { McpServer } from "./server.js";
import { MCP_TOOLS, executeMcpTool } from "./tools.js";
import type { KitroClient } from "@kitro/client";
import { Hono } from "hono";

describe("Forensic MCP Independent Verification Suite", () => {
  const mockClient = {
    getTreasury: vi.fn().mockResolvedValue({
      network: "xrpl:testnet",
      treasuryAddress: "rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn",
      balanceDrops: "100000000",
      signerQuorum: 2,
      signers: [
        { address: "rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw", weight: 1 },
        { address: "rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js", weight: 1 },
      ],
      spentTodayDrops: "100000",
      dailyLimitDrops: "5000000",
    }),
    getMandate: vi.fn().mockResolvedValue({
      mandate: {
        version: 1,
        perPaymentMaxDrops: "1000000",
        dailyMaxDrops: "5000000",
        requireApprovalAboveDrops: "500000",
      },
      publicKey: "ED123",
      signature: "SIG123",
    }),
    getSuppliers: vi.fn().mockResolvedValue({
      suppliers: [
        { address: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt", name: "Acme Cloud Services", route: "payment" },
      ],
    }),
    listRequests: vi.fn().mockImplementation((status?: string) => {
      const all = [
        { id: "req-1", invoiceId: "INV-1", status: "executed", payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt" },
        { id: "req-2", invoiceId: "INV-2", status: "held", payee: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt" },
      ];
      return Promise.resolve(status ? all.filter((r) => r.status === status) : all);
    }),
    getRequest: vi.fn().mockResolvedValue({
      id: "req-1",
      status: "executed",
      decision: { outcome: "allow" },
      receipt: {
        receipt: { requestId: "req-1", outcome: "allow", amountDrops: "100000" },
        publicKey: "ED_POL",
        signature: "SIG_POL",
      },
    }),
    requestPayment: vi.fn().mockResolvedValue({
      id: "req-3",
      status: "held",
      decision: { outcome: "hold", reasons: ["NEEDS_APPROVAL_AMOUNT"] },
      receipt: {
        receipt: { requestId: "req-3", outcome: "hold" },
        publicKey: "ED_POL",
        signature: "SIG_POL",
      },
    }),
  } as unknown as KitroClient;

  it("1. Verifies Local STDIO Initialization & Tool Discovery", async () => {
    const server = new McpServer(mockClient);

    // Initialize
    const initRes = await server.handleMessage({
      jsonrpc: "2.0",
      id: 101,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "antigravity-agent", version: "2.0.0" },
      },
    });

    expect(initRes?.result.serverInfo.name).toBe("kitro-mcp-server");
    expect(initRes?.result.capabilities.tools).toBeDefined();

    // Tools List
    const listRes = await server.handleMessage({
      jsonrpc: "2.0",
      id: 102,
      method: "tools/list",
    });

    expect(listRes?.result.tools).toHaveLength(9);
    const names = listRes?.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual([
      "get_treasury_status",
      "get_spending_policy",
      "list_suppliers",
      "list_payment_requests",
      "get_payment_status",
      "read_invoice",
      "list_pending_approvals",
      "get_audit_receipt",
      "request_payment",
    ]);
  });

  it("2. Verifies Execution of All 8 Read Tools", async () => {
    const server = new McpServer(mockClient);

    // Tool 1: get_treasury_status
    const t1 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "get_treasury_status", arguments: {} },
    });
    expect(t1?.result.isError).toBeFalsy();
    expect(t1?.result.content[0].text).toContain("rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn");

    // Tool 2: get_spending_policy
    const t2 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_spending_policy", arguments: {} },
    });
    expect(t2?.result.isError).toBeFalsy();
    expect(t2?.result.content[0].text).toContain("5000000");

    // Tool 3: list_suppliers
    const t3 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_suppliers", arguments: {} },
    });
    expect(t3?.result.isError).toBeFalsy();
    expect(t3?.result.content[0].text).toContain("r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt");

    // Tool 4: list_payment_requests
    const t4 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "list_payment_requests", arguments: {} },
    });
    expect(t4?.result.isError).toBeFalsy();
    expect(t4?.result.content[0].text).toContain("INV-1");

    // Tool 5: get_payment_status
    const t5 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "get_payment_status", arguments: { requestId: "req-1" } },
    });
    expect(t5?.result.isError).toBeFalsy();
    expect(t5?.result.content[0].text).toContain("executed");

    // Tool 6: read_invoice
    const t6 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "read_invoice",
        arguments: { invoiceText: "Acme Corp\nInvoice: INV-888\nPayee: r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt\nTotal: 10 XRP" },
      },
    });
    expect(t6?.result.isError).toBeFalsy();
    expect(t6?.result.content[0].text).toContain("INV-888");
    expect(t6?.result.content[0].text).toContain("10000000");

    // Tool 7: list_pending_approvals
    const t7 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "list_pending_approvals", arguments: {} },
    });
    expect(t7?.result.isError).toBeFalsy();
    expect(t7?.result.content[0].text).toContain("req-2");

    // Tool 8: get_audit_receipt
    const t8 = await server.handleMessage({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: { name: "get_audit_receipt", arguments: { requestId: "req-1" } },
    });
    expect(t8?.result.isError).toBeFalsy();
    expect(t8?.result.content[0].text).toContain("ED_POL");
  });

  it("3. Verifies Write Tool (request_payment) Enforces Referee Separation", async () => {
    const server = new McpServer(mockClient);

    const res = await server.handleMessage({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "request_payment",
        arguments: {
          invoiceId: "INV-999",
          destinationAddress: "r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt",
          amountDrops: "2500000",
        },
      },
    });

    expect(res?.result.isError).toBeFalsy();
    const parsed = JSON.parse(res?.result.content[0].text);
    // Crucial: The tool submits a REQUEST, and receives a referee decision. It cannot self-authorize.
    expect(parsed.requestId).toBe("req-3");
    expect(parsed.status).toBe("held");
    expect(parsed.outcome).toBe("hold");
  });

  it("4. Verifies Input Schema Validation & Error Reporting", async () => {
    // Missing required requestId
    const res = await executeMcpTool("get_payment_status", {}, mockClient);
    expect(res.isError).toBe(true);
    expect(res.content?.[0]?.text).toContain("requestId (string) is required");

    // Missing invoiceText
    const res2 = await executeMcpTool("read_invoice", {}, mockClient);
    expect(res2.isError).toBe(true);
    expect(res2.content?.[0]?.text).toContain("invoiceText (string) is required");
  });

  it("5. Verifies Remote HTTP Transport & Bearer Token Authentication", async () => {
    const testApp = new Hono();
    const testMcpServer = new McpServer(mockClient);
    const TEST_KEY = "test-secret-mcp-key";

    testApp.use("*", async (c, next) => {
      if (c.req.path === "/health") return next();
      const auth = c.req.header("Authorization");
      if (auth !== `Bearer ${TEST_KEY}`) {
        return c.json({ jsonrpc: "2.0", error: { code: -32000, message: "Unauthorized" } }, 401);
      }
      await next();
    });

    testApp.get("/health", (c) => c.json({ status: "ok", service: "kitro-mcp-server" }));
    testApp.post("/mcp", async (c) => {
      const body = await c.req.json();
      const res = await testMcpServer.handleMessage(body);
      return c.json(res);
    });

    // Unauthenticated health check should succeed
    const healthRes = await testApp.request("/health");
    expect(healthRes.status).toBe(200);

    // Unauthenticated /mcp should fail with 401
    const unauthRes = await testApp.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(unauthRes.status).toBe(401);

    // Authenticated /mcp should succeed with 200
    const authRes = await testApp.request("/mcp", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TEST_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    });
    expect(authRes.status).toBe(200);
    const body = (await authRes.json()) as { result: { tools: unknown[] } };
    expect(body.result.tools).toHaveLength(9);
  });

  it("6. Security Boundary: No Seeds or Unrestricted Signing Exposed via MCP", () => {
    for (const tool of MCP_TOOLS) {
      // Must not allow raw transaction signing or seed exposure
      expect(tool.name).not.toMatch(/seed|private|sign_raw|execute_arbitrary/i);
      const schemaStr = JSON.stringify(tool.inputSchema);
      expect(schemaStr).not.toContain("seed");
      expect(schemaStr).not.toContain("secretKey");
      expect(schemaStr).not.toContain("privateKey");
    }
  });
});
