# CONNECTING KITRO TO AI ASSISTANTS (MCP INTEGRATION GUIDE)
**Platform Version:** 0.1.0-testnet  
**Official Repository:** `https://github.com/heyrapto/kitro`  
**Protocol:** Model Context Protocol (MCP) — 2024-11-05 Specification  
**Supported Transports:** Local STDIO & Remote Streamable HTTP / Server-Sent Events (SSE)

---

## 1. OVERVIEW: THE NINE KITRO MCP TOOLS

When you connect Kitro to an AI assistant, the model gains access to 9 specialized financial operations tools:

### Read-Only Tools
1. `get_treasury_status`: Query live on-ledger balance, multisig quorum, and remaining 24-hour spending capacity.
2. `get_spending_policy`: Query active mandate limits (per-payment cap, daily aggregate cap, approval threshold).
3. `list_suppliers`: List all verified, allowlisted supplier addresses on the treasury registry.
4. `list_payment_requests`: Retrieve recent payment requests filtered by status (`received`, `held`, `approved`, `refused`).
5. `get_payment_status`: Inspect real-time status and on-ledger settlement hash of a specific payment request.
6. `read_invoice`: Parse unstructured invoice text into structured vendor, address, and XRP drop amounts.
7. `list_pending_approvals`: Query all payments awaiting human operator authorization.
8. `get_audit_receipt`: Retrieve the cryptographic SHA-256 audit receipt for any evaluated request.

### Controlled Write Tool
9. `request_payment`: Propose an invoice payment to the independent policy referee.
   - **Crucial Security Boundary:** This tool *only* submits a proposal to the referee service. It **never** receives or handles private keys, and cannot unilaterally authorize settlement on XRPL.

---

## 2. CONNECTING TO GOOGLE ANTIGRAVITY

### A. Configuration File Location
On Windows, locate or create the MCP configuration in your workspace or user directory:
- Project Workspace: `<KITRO_WORKSPACE>\.agents\mcp_config.json`
- Global Directory: `%USERPROFILE%\.gemini\antigravity\mcp_config.json`

### B. Configuration JSON
Add the following configuration block:
```json
{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--prefix", "C:\\Users\\USER\\Desktop\\CODE PROJECTS\\KITRO REPO\\kitro", "--filter", "@kitro/mcp", "start"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787"
      }
    }
  }
}
```
*(Note: Replace the absolute path with the location of your cloned `kitro` repository).*

### C. Prerequisites & Startup
1. Ensure the Policy Service is running in a terminal:
   ```bash
   pnpm --filter @kitro/policy-service dev
   ```
2. In Antigravity, reload the MCP servers.
3. Test the connection by asking:
   > *"Check my Kitro treasury balance and active spending policy."*

---

## 3. CONNECTING TO CLAUDE DESKTOP

### A. Configuration File Location
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
  *(Typically: `C:\Users\<USERNAME>\AppData\Roaming\Claude\claude_desktop_config.json`)*
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### B. Configuration JSON
```json
{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--prefix", "C:\\Users\\USER\\Desktop\\CODE PROJECTS\\KITRO REPO\\kitro", "--filter", "@kitro/mcp", "start"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787"
      }
    }
  }
}
```

### C. Verification in Claude Desktop
1. Completely quit and restart Claude Desktop.
2. In the chat prompt box, locate the hammer icon.
3. Confirm that all 9 tools under `kitro` appear (e.g. `get_treasury_status`, `request_payment`).
4. Test by prompting:
   > *"What are the approved suppliers currently allowlisted in Kitro?"*

---

## 4. CHATGPT & REMOTE STREAMABLE HTTP INTEGRATION

### A. Capabilities & Limitations
- **Custom MCP in ChatGPT:** Direct custom MCP integration currently requires a ChatGPT Team, Enterprise, or Developer subscription with custom actions / MCP connectors enabled.
- **Remote HTTPS Requirement:** ChatGPT requires public HTTPS endpoints. It cannot directly connect to `localhost`.
- **Security Notice:** Never expose an unauthenticated local MCP server through a public tunnel (such as ngrok or Cloudflare Tunnel). Always set `KITRO_MCP_API_KEY`.

### B. Launching the Remote HTTP / SSE Server
Kitro includes a hardened Streamable HTTP & SSE transport:
```bash
# Set secure Bearer token and launch HTTP transport on port 3001
$env:KITRO_MCP_API_KEY="your-secure-shared-secret-token"
pnpm dev:mcp:http
```

- **HTTP JSON-RPC 2.0 Endpoint:** `http://localhost:3001/mcp`
- **SSE Stream Endpoint:** `http://localhost:3001/sse`
- **Health Check:** `http://localhost:3001/health`

---

## 5. PRACTICAL AI WALKTHROUGH PROMPTS

Try these prompts with your connected AI assistant:

### Check Treasury Status
> *"Check my Kitro treasury balance, active signer quorum and remaining daily spending capacity."*  
*Calls `get_treasury_status` $\to$ Returns on-ledger balance (~99.98 XRP), quorum 2, and daily capacity.*

### Inspect Policy Mandate
> *"Explain our current Kitro spending policy, including the single-payment cap and approval threshold."*  
*Calls `get_spending_policy` $\to$ Explains 1 XRP cap, 5 XRP daily limit, and 0.5 XRP approval threshold.*

### Read and Extract an Invoice
> *"Read this invoice and extract the supplier name, destination XRPL address, invoice reference and amount in drops:*  
> *INVOICE #INV-2026-CLOUD-01 | Vendor: Reliable Cloud Services Ltd | Payee: rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze | Total: 0.01 XRP"*  
*Calls `read_invoice` $\to$ Extracts structured data with 10,000 drops.*

### Submit a Safe Payment Request
> *"Submit this invoice as a payment request to Kitro. Do not attempt to authorize or settle it yourself. Show me the policy referee's decision."*  
*Calls `request_payment` $\to$ Policy referee evaluates the request $\to$ Returns ALLOW decision with cryptographic receipt digest.*

### Check Approval Queue
> *"Show all payment requests currently held for human operator approval."*  
*Calls `list_pending_approvals` $\to$ Returns held high-value requests.*

### Verify Audit Evidence
> *"Retrieve the cryptographic audit receipt for payment request req-live-001 and show its XRPL transaction hash."*  
*Calls `get_audit_receipt` and `get_payment_status` $\to$ Displays SHA-256 digest and validated on-ledger hash.*

---

## 6. KITRO'S BEST USE CASE: AUTONOMOUS ACCOUNTS PAYABLE

A modern business receives hundreds of routine vendor invoices each month:
- Cloud infrastructure providers (AWS, Google Cloud, compute vendors).
- Cybersecurity contractor billables.
- SaaS software subscriptions.
- Logistics and supply chain carriers.

### The Problem Without Kitro
- If an AI agent has the treasury wallet key: Prompt injection or a malformed invoice could drain millions of dollars in a single transaction.
- If a human must approve every \$45 invoice: The operational benefits of autonomous accounts payable are completely lost.

### The Kitro Workflow in Action
1. **Invoice Intake:** A vendor emails an invoice for 45 XRP to `rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze`.
2. **AI Extraction:** The AI assistant uses `read_invoice` to parse the document.
3. **Policy Proposal:** The AI uses `request_payment` to propose payment.
4. **Deterministic Policy Check:**
   - *Payee Check:* `rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze` is in the approved allowlist $\checkmark$.
   - *Single-Payment Cap Check:* 45 XRP $\le$ 50 XRP auto-approval cap $\checkmark$.
   - *Daily Limit Check:* Daily aggregate capacity is available $\checkmark$.
5. **Decision & 2-of-2 Settlement:**
   - Policy Referee evaluates $\to$ `ALLOW`.
   - Agent Signer signs transaction blob.
   - Policy Referee verifies mandate rules and independently signs transaction blob.
   - XRPL consensus receives the combined 2-of-2 signature and settles the payment in 3 seconds.
6. **Exception Handling:**
   - If the invoice was for **350 XRP** (above the 50 XRP approval threshold): Evaluates $\to$ `HOLD` $\to$ placed in human approval queue.
   - If the invoice was for **750 XRP** (above absolute 500 XRP cap): Evaluates $\to$ `REFUSE` $\to$ blocked immediately.
   - If the destination address is unfamiliar: Evaluates $\to$ `REFUSE` $\to$ zero money moves.
