# KITRO — MASTER FINAL HANDOFF & VERIFICATION RUNBOOK
**Classification:** Hackathon Deliverable & Technical Audit Reference  
**Platform Version:** 0.1.0-testnet  
**Target Ledger:** XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)  
**Official Repository:** `https://github.com/heyrapto/kitro`  
**Status:** 100% Operational & Verified On-Ledger  

---

## SECTION A — HOW TO START KITRO (EXACT WINDOWS COMMANDS)

Open three separate terminals in your workspace directory (`c:\Users\USER\Desktop\CODE PROJECTS\KITRO REPO\kitro`):

### Terminal 1: Start Policy Referee Service (Port 8787)
```powershell
pnpm --filter @kitro/policy-service dev
# Ready message: [KITRO-POLICY] Referee service running on http://localhost:8787
```

### Terminal 2: Start Kitro Dashboard (Port 3000)
```powershell
pnpm --filter @kitro/dashboard dev
# Ready message: ▲ Next.js 15.x.x - Local: http://localhost:3000
```

### Terminal 3: Start Model Context Protocol (MCP) Server (Port 3001)
```powershell
pnpm dev:mcp:http
# Ready message: [KITRO-MCP] Streamable HTTP Server starting on http://127.0.0.1:3001...
```

To run the complete automated test suite across all 10 workspaces:
```powershell
# Typecheck, Lint, Unit Tests, and Playwright Browser Tests
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @kitro/dashboard test:e2e
```

---

## SECTION B — TESTNET WALLETS & MULTISIG VERIFICATION

The repository is already configured and verified with active, funded XRPL Testnet accounts:

| Account Role | Classic Address | Balance | Quorum & Weight |
| :--- | :--- | :--- | :--- |
| **Treasury (Operator Vault)** | `rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk` | ~99.98 XRP | Quorum Required = 2 |
| **Agent Signer (AI Execution)** | `rH3Gng7Nz9JhGPPpjjbDoQBATSDWjaEZSc` | 100.00 XRP | Weight = 1 |
| **Policy Signer (Referee)** | `r4sML1TA1mqjEbtEBJ1PfwWNs9yy2djyNn` | 100.00 XRP | Weight = 1 |
| **Verified Supplier** | `rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze` | 100.00 XRP | Payee (*Reliable Cloud Services Ltd*) |

### On-Ledger SignerListSet Proof
- **Transaction Hash:** `71856854C8DEA4B67825FA5386883E54DCA48A2497FF36E2D8775F66A1884910`
- **Validated Ledger Sequence:** `22305905` (`tesSUCCESS`)
- **Explorer Link:** [Inspect SignerListSet on XRPL Testnet Explorer](https://testnet.xrpl.org/transactions/71856854C8DEA4B67825FA5386883E54DCA48A2497FF36E2D8775F66A1884910)

To re-fund or generate brand-new fresh wallets at any time:
```powershell
pnpm --filter @kitro/scripts setup-testnet -- --fresh
```

---

## SECTION C — HOW TO USE THE DASHBOARD

1. **Landing Page (`http://localhost:3000`):** Review core positioning: *"Let AI handle the work. Keep control of the money."*
2. **Guided Setup (`http://localhost:3000/onboarding`):** A 7-step wizard guiding through workspace setup, network verification, wallet connection, multisig architecture, and policy rules.
3. **Treasury Overview (`http://localhost:3000/dashboard`):** Real-time balance refresh, 24-hour spending capacity, active signers, and 1-click **"Execute 2-of-2 Payment"** action.
4. **Invoice Intelligence (`http://localhost:3000/dashboard/invoices`):** Select from 4 pre-loaded real-world invoice presets, run AI extraction, evaluate with policy referee, and settle allowed requests.
5. **Approval Queue (`http://localhost:3000/dashboard/approvals`):** Review payments held for human operator authorization (e.g. invoices exceeding auto-approval thresholds).
6. **Payment Registry (`http://localhost:3000/dashboard/payments`):** Forensic table of all received, held, approved, and refused payment requests with clickable detail modal.
7. **Policy Mandate Editor (`http://localhost:3000/dashboard/policy`):** Inspect spending caps and configure approval thresholds.
8. **Supplier Allowlist (`http://localhost:3000/dashboard/suppliers`):** Registry of verified vendor addresses with direct XRPL Explorer inspect links.
9. **Audit Trail (`http://localhost:3000/dashboard/audit`):** Cryptographic SHA-256 decision digests, referee Ed25519 signatures, and validated ledger sequences.
10. **Settings & Integration (`http://localhost:3000/dashboard/settings`):** Copyable configurations for Google Antigravity, Claude Desktop, and ChatGPT, plus catalog of all 9 MCP tools.

---

## SECTION D — CONNECTING AI ASSISTANTS VIA MCP

### 1. Google Antigravity Configuration
In `.agents/mcp_config.json`:
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

### 2. Claude Desktop Configuration
In `%APPDATA%\Claude\claude_desktop_config.json`:
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

### 3. Remote HTTP / ChatGPT Actions
- Remote HTTP JSON-RPC Endpoint: `http://localhost:3001/mcp`
- Remote SSE Endpoint: `http://localhost:3001/sse`
- Health check: `http://localhost:3001/health`
- For external access, supply `KITRO_MCP_API_KEY` in environment variables.

---

## SECTION E — HOW TO USE KITRO THROUGH AI (PROMPTS & BEST USE CASE)

### Best Use Case: Autonomous Accounts Payable
A business delegates recurring supplier payments to an AI agent. The agent parses incoming invoices and prepares payment proposals. Kitro's policy referee verifies the vendor, spending limits, and daily caps. If allowed, the transaction is signed with a 2-of-2 multisignature (`Agent Signer` + `Policy Signer`) and validated on XRPL in 3 seconds. If limits are breached or the vendor is unknown, funds are protected without human intervention.

### Example AI Prompts
- **Check Status:** *"Check my Kitro treasury balance, active signer quorum and remaining daily spending capacity."*
- **Inspect Mandate:** *"Explain our current Kitro spending policy, including the single-payment maximum and approval threshold."*
- **Parse Invoice:** *"Read this invoice and extract the supplier name, destination XRPL address, invoice reference and amount: INVOICE #INV-2026-CLOUD-01 | Vendor: Reliable Cloud Services Ltd | Payee: rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze | Total: 0.01 XRP"*
- **Propose Payment:** *"Submit this invoice as a payment request to Kitro. Do not attempt to authorize or settle it yourself. Show me the policy referee's decision."*
- **Check Approvals:** *"Show all payment requests currently held for human operator approval."*
- **Inspect Audit Evidence:** *"Retrieve the cryptographic audit receipt for payment request req-live-001 and show its XRPL transaction hash."*

---

## SECTION F — THREE-MINUTE JUDGE DEMONSTRATION RUNBOOK

1. **Scene 1 (The Problem):** Open `http://localhost:3000`. Explain why giving AI agents private keys creates an unacceptable financial catastrophe risk, and why requiring human approval for every micro-payment destroys autonomy.
2. **Scene 2 (The Solution):** Open `/onboarding`. Demonstrate the 7-step guided setup and the **2-of-2 multisig architecture** (Agent Weight 1 + Policy Referee Weight 1 = Quorum 2).
3. **Scene 3 (Invoice Extraction & Settlement):** Open `/dashboard/invoices`. Select Preset 1 (0.01 XRP). Click **"Run AI Invoice Extraction"** $\to$ **"Evaluate with Policy Referee"** (Decision: `ALLOW`) $\to$ **"Execute 2-of-2 Multisig Settlement on Testnet"**. Show validated transaction hash in ~3 seconds.
4. **Scene 4 (Policy Enforcement):** Select Preset 2 (0.75 XRP). Shows `HOLD` routed to `/dashboard/approvals`. Select Preset 3 (2.0 XRP). Shows `REFUSE` (`OVER_PER_PAYMENT_CAP`). Select Preset 4. Shows `REFUSE` (`PAYEE_NOT_ALLOWED`).
5. **Scene 5 (Cryptographic Evidence):** Open `/dashboard/audit`. Show SHA-256 decision digest, Ed25519 signature, and click explorer link to view validated ledger sequence.
6. **Scene 6 (MCP Live Interaction):** Open `/dashboard/settings`. Show 9 registered tools and execute a live curl command to `http://localhost:3001/mcp`.

---

## SECTION G — TESTNET EVIDENCE & CRYPTOGRAPHIC PROOF

### 1. Validated 2-of-2 Multisig Settlement
- **Transaction Hash:** `630D1C8B63B60F8AD9AB5953749823864AE9CA3CBC5C76866789AD8BF968695F`
- **Validated Ledger Sequence:** `22305935` (`tesSUCCESS`)
- **Signers Validated by Ledger:**
  1. `rH3Gng7Nz9JhGPPpjjbDoQBATSDWjaEZSc` (Agent Signer, Weight 1)
  2. `r4sML1TA1mqjEbtEBJ1PfwWNs9yy2djyNn` (Policy Signer, Weight 1)
- **Fee:** 36 drops | **Amount:** 10,000 drops (0.01 XRP)
- **Explorer Link:** [Inspect 2-of-2 Payment on XRPL Testnet Explorer](https://testnet.xrpl.org/transactions/630D1C8B63B60F8AD9AB5953749823864AE9CA3CBC5C76866789AD8BF968695F)

### 2. Six Forensically Verified E2E Scenarios (`pnpm testnet:e2e`)
- **Scenario A (Allow & Settle):** Validated in ledger `22305935` (`tesSUCCESS`).
- **Scenario B (Approval Threshold):** Decision `HOLD` (`NEEDS_APPROVAL_AMOUNT`), routed to queue.
- **Scenario C (Over-Cap Limit):** Decision `REFUSE` (`OVER_PER_PAYMENT_CAP`), zero ledger traffic.
- **Scenario D (Unknown Payee):** Decision `REFUSE` (`PAYEE_NOT_ALLOWED`), blocked by allowlist.
- **Scenario E (Agent-Only Signing):** XRPL Consensus Rejection (`tefBAD_QUORUM`).
- **Scenario F (Policy-Only Signing):** XRPL Consensus Rejection (`tefBAD_QUORUM`).

---

## SECTION H — SECURITY GOVERNANCE & REMAINING LIMITATIONS

> **Official Security Statement:**  
> *"Routine agent-initiated payments require both the agent signer and independent policy signer. The treasury operator retains a separate master-key recovery capability in the current Testnet configuration."*

### Mainnet Roadmap & Necessary Milestones
1. **Hardware Security Module (HSM):** Policy Referee keys must be migrated from isolated process memory to Cloud HSM / secure hardware enclaves with non-exportable private keys.
2. **Disabling Treasury Master Key (`asfDisableMaster`):** After institutional cold-storage recovery keys (e.g. 3-of-5 institutional key escrow) are formally verified, disable the master key on-ledger.
3. **Formal Security Audit:** Comprehensive SOC 2 Type II and third-party cryptographic review of policy referee logic and token comparison routines.
4. **Enterprise ERP Integrations:** Inbound webhook listeners for direct SAP, NetSuite, and QuickBooks invoice streaming.
