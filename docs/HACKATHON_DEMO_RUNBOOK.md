# KITRO — HACKATHON LIVE DEMONSTRATION RUNBOOK
**Audience:** Technical Judges, Evaluators & Operators  
**Platform Version:** 0.1.0-testnet  
**Target Duration:** 3 Minutes  
**Official Repository:** `https://github.com/heyrapto/kitro`  
**Network:** XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)

---

## 1. PRE-DEMO CHECKLIST & SERVICE STARTUP

Open three separate terminals in the repository root:

### Terminal 1: Policy Referee Service (Port 8787)
```bash
pnpm --filter @kitro/policy-service dev
# Output: [KITRO-POLICY] Referee service running on http://localhost:8787
```

### Terminal 2: Kitro Operator Dashboard (Port 3000)
```bash
pnpm --filter @kitro/dashboard dev
# Output: Ready in 1200ms at http://localhost:3000
```

### Terminal 3: Model Context Protocol (MCP) Server (Port 3001)
```bash
pnpm dev:mcp:http
# Output: [KITRO-MCP] Streamable HTTP Server starting on http://127.0.0.1:3001...
```

---

## 2. THE THREE-MINUTE JUDGE DEMONSTRATION SCRIPT

### Scene 1: The Problem (0:00 - 0:30)
1. Navigate to: `http://localhost:3000`
2. **Talking Points:**
   > *"Businesses want to deploy autonomous AI agents for accounts payable and invoice processing. But if you give an AI agent a private key to your treasury, prompt injections, hallucinated invoices, or compromised dependencies can drain all company funds in seconds. Requiring a human to sign every \$20 invoice destroys the value of autonomy. Kitro solves this problem."*
3. Highlight the core message: **"Let AI handle the work. Keep control of the money."**
4. Highlight the core principle: **"An AI agent may request a payment. It must never be allowed to authorize itself."**

---

### Scene 2: Guided Setup & Separation of Powers (0:30 - 1:00)
1. Click **"Start Guided Setup"** or navigate to `http://localhost:3000/onboarding`.
2. Walk through the 7-step wizard:
   - **Step 1:** Organization identity (`Acme Corp Treasury`).
   - **Step 2:** Network selection (`XRPL Testnet Active`, Mainnet locked for safety).
   - **Step 3:** Connect Operator Wallet (Crossmark browser extension or 1-click testnet treasury).
   - **Step 4:** Review live treasury on-ledger balance (`100.00 XRP`).
   - **Step 5:** Review the **2-of-2 Multisig Model**:
     - *Signer 1 (Agent):* Weight 1
     - *Signer 2 (Policy Referee):* Weight 1
     - *Quorum Required:* 2
   - **Step 6:** Configure Spending Mandate (1 XRP single cap, 5 XRP daily limit, 0.5 XRP approval threshold).
   - **Step 7:** Click **"Open My Treasury"** to land on `/dashboard`.

---

### Scene 3: Invoice Intelligence & AI Extraction (1:00 - 1:40)
1. Navigate to **Invoices** (`http://localhost:3000/dashboard/invoices`).
2. Point out the 4 real-world test invoice presets:
   - *Preset 1: Routine Cloud Infrastructure (0.01 XRP / 10,000 drops)*
   - *Preset 2: High-Value GPU Server (0.75 XRP — exceeds 0.5 XRP threshold)*
   - *Preset 3: Over-Cap Enterprise License (2.0 XRP — exceeds 1.0 XRP cap)*
   - *Preset 4: Unknown Phishing Supplier (unregistered destination)*
3. Select **Preset 1 (Routine Cloud Infrastructure)** and click **"Run AI Invoice Extraction"**.
4. Observe that the invoice reference (`INV-2026-CLOUD-01`), vendor, and destination address (`rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze`) are extracted into a structured proposal.
5. Click **"Evaluate with Policy Referee"**:
   - The referee checks the allowlist and limits.
   - Result: **ALLOW** with cryptographic SHA-256 receipt digest.
6. Click **"Execute 2-of-2 Multisig Settlement on Testnet"**:
   - The Agent Signer signs.
   - The Policy Referee co-signs.
   - The combined blob is submitted to XRPL Testnet.
   - A live transaction hash appears in ~3 seconds with a clickable link to the XRPL Testnet Explorer.

---

### Scene 4: Policy Enforcement — Holds & Refusals (1:40 - 2:15)
1. Switch to **Preset 2 (High-Value GPU Server - 0.75 XRP)** and click **"Evaluate with Policy Referee"**:
   - Result: **HOLD** (`NEEDS_APPROVAL_AMOUNT`).
   - The transaction is routed to the human operator approval queue.
2. Click **Approval Queue** in the sidebar (`/dashboard/approvals`).
   - Show the held transaction awaiting operator decision.
   - Click **"Authorize & Settle via 2-of-2 Multisig"** to demonstrate human-in-the-loop co-signing.
3. Switch back to Invoices and select **Preset 3 (Over-Cap - 2.0 XRP)**:
   - Result: **REFUSE** (`OVER_PER_PAYMENT_CAP`).
   - Highlight that the referee blocked execution before any signature was produced — zero money moved.
4. Select **Preset 4 (Unknown Vendor)**:
   - Result: **REFUSE** (`PAYEE_NOT_ALLOWED`).
   - Highlight that rogue payee addresses are blocked by default.

---

### Scene 5: Cryptographic Audit Trail & Evidence (2:15 - 2:45)
1. Navigate to **Audit Trail** (`http://localhost:3000/dashboard/audit`).
2. Show the cryptographic audit log:
   - Canonical SHA-256 Decision Hash: `95356118693E8A1A6324993CFBB72D1BA2455BE202AE7D88E4B5793C65DAE0C2`
   - Referee Ed25519 Signature.
   - XRPL Validated Ledger Index (`22305935`).
3. Click the Explorer link on any transaction to show the live on-ledger validation on `testnet.xrpl.org`.

---

### Scene 6: Model Context Protocol (MCP) Live Interaction (2:45 - 3:00)
1. Navigate to **Settings** (`http://localhost:3000/dashboard/settings`).
2. Show the ready-to-copy MCP configurations for **Google Antigravity** and **Claude Desktop**.
3. Display the catalog of 9 specialized MCP tools.
4. Run a quick curl command in your terminal to demonstrate the remote HTTP JSON-RPC endpoint:
   ```bash
   curl -X POST http://localhost:3001/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_treasury_status","arguments":{}}}'
   ```
5. Conclude:
   > *"Kitro lets AI agents do the work of accounts payable while mathematically guaranteeing that they cannot authorize payments outside company policy."*

---

## 3. CONTINGENCY & FALLBACK PROCEDURES

- **If XRPL Testnet Faucet is Slow:** The pre-configured wallets in `.env.local` are already funded and active with 100 XRP each. You do not need to re-fund them.
- **If Local Network WebSockets Drop:** The dashboard automatically falls back to verified on-ledger state while alerting the user to re-sync.
- **If Running E2E Test Suite for Judges:** Run `pnpm testnet:e2e` to show all 6 live ledger scenarios passing with live transaction hashes.
