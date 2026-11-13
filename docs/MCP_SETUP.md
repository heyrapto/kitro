# Kitro Model Context Protocol (MCP) Integration Guide

Kitro exposes its entire financial operations and policy enforcement surface to AI agents via the **Model Context Protocol (MCP)**. This enables autonomous models (such as Claude Desktop, Google Antigravity, ChatGPT, and custom multi-agent swarms) to inspect treasury state and submit invoice payment requests safely.

---

## The Kitro Security Guarantee in MCP

> **Core Principle:** An AI agent may request a payment. It can **never** authorize itself.

- **Read Tools (8)**: Fully transparent read access to treasury balances, active spending rules, authorized suppliers, payment queue, pending human approvals, and cryptographic audit receipts.
- **Write Tool (1)**: `request_payment` submits a payment request to the deterministic **Policy Referee**.
  - Evaluated deterministically against active mandate rules.
  - If allowed and under auto-approval threshold: marked approved and prepared for 2-of-2 multisignature co-signing.
  - If over threshold or payee unrecognized: placed in `held` status awaiting human operator authorization.
  - If violating mandate caps: refused with a signed cryptographic receipt.
  - **No agent key or private seed is ever exposed over MCP.**

---

## 1. Setup for Claude Desktop (Local STDIO)

Add Kitro to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kitro": {
      "command": "node",
      "args": [
        "--loader",
        "tsx",
        "<PATH_TO_KITRO_REPO>/apps/mcp/src/index.ts"
      ],
      "env": {
        "KITRO_API_URL": "http://localhost:8787",
        "AGENT_API_TOKEN": "kitro_agent_secret_token"
      }
    }
  }
}
```

*Alternatively, using `pnpm`:*
```json
{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--filter", "@kitro/mcp", "start"],
      "cwd": "<PATH_TO_KITRO_REPO>",
      "env": {
        "KITRO_API_URL": "http://localhost:8787",
        "AGENT_API_TOKEN": "kitro_agent_secret_token"
      }
    }
  }
}
```

Restart Claude Desktop. The hammer icon will display the 9 Kitro tools.

---

## 2. Setup for Google Antigravity

In your Antigravity workspace configuration (`mcp_config.json` or through the Custom MCP Servers UI):

```json
{
  "mcpServers": {
    "kitro": {
      "command": "npx",
      "args": ["tsx", "apps/mcp/src/index.ts"],
      "cwd": "<PATH_TO_KITRO_REPO>",
      "env": {
        "KITRO_API_URL": "http://localhost:8787",
        "AGENT_API_TOKEN": "kitro_agent_secret_token"
      }
    }
  }
}
```

---

## 3. Setup for ChatGPT Actions / Remote Agents (Streamable HTTP & SSE)

Kitro provides a production-grade Remote Streamable HTTP and SSE MCP server.

### Starting the Remote Server

```bash
# Terminal
export MCP_PORT=3001
export KITRO_MCP_API_KEY="sk_live_kitro_mcp_secure_key"
export KITRO_API_URL="http://localhost:8787"

pnpm dev:mcp:http
```

### Remote Endpoints

- **JSON-RPC 2.0**: `POST http://localhost:3001/mcp`
- **Server-Sent Events (SSE)**: `GET http://localhost:3001/sse`
- **SSE Message Delivery**: `POST http://localhost:3001/message?sessionId=<SESSION_ID>`
- **Health Check**: `GET http://localhost:3001/health`

### Authentication

Remote requests require the Bearer token in the `Authorization` header:
```http
POST /mcp HTTP/1.1
Host: localhost:3001
Authorization: Bearer sk_live_kitro_mcp_secure_key
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_treasury_status",
    "arguments": {}
  }
}
```

### ChatGPT Custom GPT Action Schema

For ChatGPT Custom GPTs, use the OpenAPI specification to connect to the `/mcp` or REST wrapper endpoints.

---

## 4. Complete Tool Reference

| Tool Name | Type | Description |
| :--- | :--- | :--- |
| `get_treasury_status` | Read | Balance, active signers, 2-of-2 quorum status, daily spend capacity. |
| `get_spending_policy` | Read | Single transaction cap, daily limit, auto-approval threshold, routes. |
| `list_suppliers` | Read | Allowlist of approved vendor addresses and routing protocols. |
| `list_payment_requests` | Read | Recent payment requests with optional filter (`received`, `held`, `approved`, `refused`). |
| `get_payment_status` | Read | Status, policy decision, reason code, and XRPL tx hash for a request ID. |
| `read_invoice` | Read | Parses raw invoice text to extract vendor, payee address, and amount in drops/XRP. |
| `list_pending_approvals` | Read | Requests held by the referee awaiting operator human authorization. |
| `get_audit_receipt` | Read | Cryptographic Ed25519/secp256k1 decision receipt signed by the policy referee. |
| `request_payment` | Write | Submits invoice payment to the policy referee for deterministic evaluation. |

### Example Tool Invocation: `request_payment`

```json
{
  "name": "request_payment",
  "arguments": {
    "invoiceId": "INV-2026-8812",
    "destinationAddress": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "amountDrops": "1500000",
    "memo": "Monthly AWS Infrastructure Hosting"
  }
}
```

**Response (Held for Human Approval):**
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "held",
  "outcome": "hold",
  "reasons": ["AMOUNT_EXCEEDS_AUTO_APPROVAL"],
  "explanation": "Payment request HELD by policy referee. Transaction requires human operator approval before signing (exceeds auto-approval limit or destination requires review).",
  "receipt": {
    "receipt": {
      "requestId": "550e8400-e29b-41d4-a716-446655440000",
      "invoiceId": "INV-2026-8812",
      "payee": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      "amountDrops": "1500000",
      "outcome": "hold",
      "reasons": ["AMOUNT_EXCEEDS_AUTO_APPROVAL"],
      "mandateVersion": 1,
      "issuedAt": "2026-11-13T17:30:00.000Z"
    },
    "publicKey": "ED7890ABC...",
    "signature": "3045022100..."
  }
}
```
