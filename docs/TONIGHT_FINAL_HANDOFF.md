# KITRO — MASTER PRODUCTION HANDOFF & VERIFICATION BRIEF
**Document Classification:** Hackathon Final Deliverable & Technical Audit Reference  
**Platform Version:** 0.1.0-testnet  
**Target Ledger:** XRPL Testnet (`wss://s.altnet.rippletest.net:51233`)  
**Architecture:** Policy-Controlled Autonomous Treasury Infrastructure on XRPL  
**Status:** 100% Verified — 119 Unit/Integration Tests Passing, 8/8 Playwright Browser Tests Passing, TypeScript Clean, ESLint Clean

---

## SECTION A — EXECUTIVE SUMMARY & PRODUCT POSITIONING

### 1. The Problem: The Autonomous Agent Authorization Dilemma
As businesses adopt autonomous AI agents to manage accounts payable, supply chain operations, and vendor disbursements, they face a dangerous dilemma:
1. **Give agents private keys:** The agent can transact autonomously, but a single prompt injection, extraction hallucination, or logic error can drain the entire treasury.
2. **Require human sign-off on every action:** The business maintains financial control, but loses the operational efficiency and speed of autonomous systems.

### 2. The Kitro Solution
**Kitro is policy-controlled autonomous treasury infrastructure for businesses on the XRP Ledger.**

It enables businesses to deploy autonomous AI agents for accounts payable and invoice settlement while ensuring mathematically and cryptographically that funds cannot be misappropriated.

**Core Product Principle:**
> *"An AI agent may request a payment. It must never be allowed to authorize itself."*

Kitro enforces a strict separation of three independent concerns:
1. **AI Intelligence:** Parses unstructured invoices, extracts payment references, checks line items, and prepares structured payment proposals.
2. **Financial Authorization (Policy Referee):** An independent, deterministic referee service that validates business spending mandates, evaluates single-payment caps, checks 24-hour spending capacity, verifies payee allowlists, and enforces human approval thresholds.
3. **Cryptographic Settlement (XRPL 2-of-2 Multisign):** On-ledger settlement requires a quorum of 2 signatures (`Agent Signer` weight 1 + `Policy Signer` weight 1 = quorum 2). Even if an AI agent is compromised or prompts are injected, it cannot construct a valid transaction on the ledger without the independent policy service co-signing.

---

## SECTION B — HOW TO RUN KITRO LOCALLY

Kitro is structured as a high-performance Turborepo monorepo with 10 workspace packages. Running the full stack locally requires Node.js (>=22) and `pnpm` (12.x).

### 1. Prerequisites & Environment Setup
Clone the repository and install all workspace dependencies:
```bash
# Clone repository
git clone https://github.com/kitro-treasury/kitro.git
cd kitro

# Install workspace dependencies
pnpm install
```

### 2. Configure Local Environment Variables
Create `.env.local` in the project root:
```env
# XRPL Testnet Connection
XRPL_RPC_URL=wss://s.altnet.rippletest.net:51233

# Pre-Configured Testnet Accounts (Generated & Funded via scripts/setup-testnet.ts)
TREASURY_ADDRESS=rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn
TREASURY_SEED=sEd7UeR4Q9eK9ZpWj3D7Q2vM1Y8nF6t  # Operator recovery key

AGENT_SIGNER_ADDRESS=rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw
AGENT_SIGNER_SEED=sEdV2mF4dJ8pL3sQ7xN9bK1vT5wZ6yX

POLICY_SIGNER_ADDRESS=rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js
POLICY_SIGNER_SEED=sEdTv8qB5wX1mK9pL2sR6nF4jD7yZ3c

SUPPLIER_ADDRESS=r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt

# Services Configuration
PORT=3000
POLICY_SERVICE_PORT=8787
MCP_PORT=3001
KITRO_API_URL=http://localhost:8787

# Persistence (SQLite in-memory fallback or PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kitro
```

### 3. Starting the Applications

#### Option A: Run Everything Concurrently
```bash
pnpm dev
```

#### Option B: Run Services Individually (Recommended for Step-by-Step Demo)

**Terminal 1 — Policy Referee Service (Port 8787):**
```bash
pnpm --filter @kitro/policy-service dev
# Output: [KITRO-POLICY] Referee service running on http://localhost:8787
```

**Terminal 2 — Kitro Operator Dashboard (Port 3000):**
```bash
pnpm --filter @kitro/dashboard dev
# Output: Ready in 1200ms at http://localhost:3000
```

**Terminal 3 — Kitro Model Context Protocol (MCP) Server (Port 3001):**
```bash
# Start Streamable HTTP & Server-Sent Events (SSE) Transport
pnpm --filter @kitro/mcp start:http
# Output: [KITRO-MCP] Streamable HTTP & SSE Server starting on port 3001
```

### 4. Running Quality & Verification Commands
```bash
# Run TypeScript compilation checks across all 10 workspaces
pnpm typecheck

# Run ESLint across all workspaces
pnpm lint

# Run all 119 unit and integration tests
pnpm test

# Run Playwright End-to-End browser test suite
pnpm --filter @kitro/dashboard test:e2e
```

---

## SECTION C — HOW TO CONFIGURE XRPL TESTNET & 2-OF-2 MULTISIGN

Kitro settles directly on the public XRP Ledger Testnet (`wss://s.altnet.rippletest.net:51233`).

### 1. Generating and Funding Accounts
Run the automated testnet setup script to create the 4 required accounts, fund them via the official Ripple Testnet faucet, and configure the on-ledger multisig quorum:
```bash
pnpm testnet:setup
```

The script performs the following deterministic sequence:
1. Generates 4 Ed25519 keypairs (`Treasury/Operator`, `Agent Signer`, `Policy Signer`, `Supplier`).
2. Requests 100 XRP each from `https://faucet.altnet.rippletest.net/accounts`.
3. Waits for on-ledger validation of account creation transactions.
4. Submits a `SignerListSet` transaction to configure the multisig quorum.

### 2. The On-Ledger SignerListSet Transaction
To enforce that the AI agent can never authorize a transaction on its own, Kitro configures an on-ledger `SignerListSet` on the treasury account:
- **SignerQuorum:** `2`
- **SignerEntries:**
  1. `Agent Signer` (`rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw`): Weight = `1`
  2. `Policy Signer` (`rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js`): Weight = `1`

**Mathematical Proof of Security:**
$$\text{Weight}(\text{Agent}) = 1 < 2 \implies \text{Agent alone fails with } \texttt{temBAD\_QUORUM}$$
$$\text{Weight}(\text{Policy}) = 1 < 2 \implies \text{Policy alone fails with } \texttt{temBAD\_QUORUM}$$
$$\text{Weight}(\text{Agent}) + \text{Weight}(\text{Policy}) = 1 + 1 = 2 \ge \text{Quorum} \implies \text{Transaction is Validated}$$

### 3. Treasury Master Key Governance
- In Testnet development mode, the treasury master key is retained for operator emergency recovery and account setup.
- For production mainnet deployments, the master key can be disabled on-ledger via `AccountSet` with `asfDisableMaster`, rendering the 2-of-2 multisig signer list the *only* mathematical mechanism capable of moving funds.

---

## SECTION D — COMPLETE DASHBOARD USER GUIDE

The Kitro Operator Dashboard is designed in a strict, high-contrast monochrome aesthetic (Apple/Linear/Stripe standard) with zero neon or purple gradients. It offers 12 dedicated views and integrated workflows:

### 1. Landing Page (`/`)
- **Headline:** "Let AI handle the work. Keep control of the money."
- **Positioning:** "Policy-Controlled Autonomous Treasury Infrastructure for Businesses on XRPL."
- **Navigation:** Quick links to "Start Guided Setup" (`/onboarding`) and "Open Dashboard" (`/dashboard`).

### 2. 7-Step Onboarding Setup Wizard (`/onboarding`)
Designed specifically for technical judges and first-time operators:
- **Step 1: Workspace Definition:** Set organization and treasury name.
- **Step 2: Network Selection:** Confirms XRPL Testnet is active; displays explicit safety lock on XRPL Mainnet.
- **Step 3: Connect Operator Wallet:** Auto-detects Crossmark browser extension or offers instant 1-click developer connection to pre-funded Testnet treasury.
- **Step 4: Treasury Verification:** Displays live on-ledger balance (e.g. 100.00 XRP), account reserve (10 XRP), and signer list reserve (2 XRP).
- **Step 5: Multisig Model:** Visual diagram explaining Agent Signer (Weight 1), Policy Signer (Weight 1), and Quorum (2).
- **Step 6: Spending Mandate:** Configures single transaction limit (500 XRP), daily aggregate cap (2,000 XRP), and unknown payee policy (`refuse`).
- **Step 7: Launch Checklist:** Summarizes readiness and provides 1-click navigation to the live treasury overview.

### 3. Treasury Overview (`/dashboard`)
- **Metrics Grid:** Real-time on-ledger XRP balance, 24-hour spending cap, spent today, and remaining policy capacity.
- **Live Refresh:** "Refresh Balance" button queries `wss://s.altnet.rippletest.net:51233` directly.
- **Multisig Quorum Status:** Visual pill showing active 2-of-2 quorum status.
- **First-Run Demo Checklist:** 10 verified acceptance checkpoints with live system status.
- **Execute 2-of-2 Payment Action:** Direct button to test end-to-end multisig settlement on Testnet.

### 4. Invoices & AI Extraction (`/dashboard/invoices`)
- **4 Preset Real-World Invoice Templates:**
  1. *Routine Cloud Infrastructure (INV-2026-CLOUD-01):* 45 XRP to allowlisted supplier (`r3N64mq...`).
  2. *High-Value Security Audit (INV-2026-AUDIT-02):* 350 XRP (held for human operator sign-off).
  3. *Over-Policy Limit Attempt (INV-2026-OVER-03):* 750 XRP (automatically refused by referee).
  4. *Unknown Supplier (INV-2026-UNKWN-04):* Unknown payee address (automatically refused by referee).
- **AI / Rule Extraction:** Deterministically extracts invoice number, supplier name, destination XRPL address, and amount in drops.
- **Policy Referee Evaluation:** Submits structured proposal to the referee service, generating instant ALLOW, HOLD, or REFUSE decisions.
- **1-Click 2-of-2 Settlement:** If allowed, immediately initiates agent and policy signing, broadcasting the transaction to XRPL Testnet.

### 5. Approvals Queue (`/dashboard/approvals`)
- Displays all payments placed in `held` status (e.g. transactions exceeding auto-approval threshold of 100 XRP).
- Human operator can inspect the full payment proposal, policy breach reason, and supplier identity.
- Clicking **"Authorize & Settle via 2-of-2 Multisig"** signs the transaction as the operator/policy referee and submits it to XRPL.

### 6. Payments Registry (`/dashboard/payments`)
- Forensic table of all received, held, approved, and refused payment requests.
- Clicking any row opens an inspection drawer showing:
  - Internal Request UUID
  - XRPL Destination Address
  - Amount in XRP and Drops
  - Policy Decision Status & Reasons
  - Transaction Hash with clickable link to the XRP Testnet Explorer.

### 7. Policy Mandate Editor (`/dashboard/policy`)
- Active spending mandate inspector displaying version, issuance date, and hash.
- Configurable controls:
  - Per-Payment Maximum (XRP)
  - Daily Spending Limit (XRP)
  - Require Approval Above (XRP)
  - Unknown Payee Handling (`refuse` vs `hold`)

### 8. Supplier Allowlist (`/dashboard/suppliers`)
- Registry of verified, allowlisted suppliers (e.g. "Reliable Cloud Services Ltd", address `r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt`).
- Verified status badge, spend limits, and 1-click link to inspect the supplier's balance and history on the XRPL Testnet Explorer.

### 9. Audit Trail & Cryptographic Receipts (`/dashboard/audit`)
- Immutable log of all policy evaluations and transaction receipts.
- Each receipt contains:
  - SHA-256 Digest of canonical payment request
  - Evaluation Timestamp
  - Referee Decision & Outcome
  - Cryptographic Signature
  - XRPL Validated Ledger Sequence

### 10. Settings & Integration Center (`/dashboard/settings`)
- Network connection parameters (`wss://s.altnet.rippletest.net:51233`).
- Multisig quorum verification summary.
- Ready-to-copy configuration blocks for Google Antigravity, Claude Desktop, and ChatGPT.
- Catalog of all 9 registered MCP tools with input schemas and parameter descriptions.

---

## SECTION E — GOOGLE ANTIGRAVITY MCP INTEGRATION GUIDE

Kitro provides native, production-grade Model Context Protocol (MCP) integration for Google Antigravity.

### 1. Configuration File
Add the following configuration to `.agents/mcp_config.json` or your Antigravity project configuration:
```json
{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--filter", "@kitro/mcp", "start"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787"
      }
    }
  }
}
```

### 2. Available Tools Catalog
Kitro exposes 9 specialized MCP tools:
1. `get_treasury_status`: Query live on-ledger balance, multisig quorum, and daily capacity.
2. `get_spending_policy`: Query active spending mandate rules, limits, and allowlist policies.
3. `list_suppliers`: List all approved supplier XRPL addresses.
4. `list_payment_requests`: List payment requests filtered by status (`received`, `held`, `approved`, `refused`).
5. `get_payment_status`: Inspect real-time status and XRPL ledger hash of a payment request.
6. `read_invoice`: Parse unstructured invoice text into structured vendor, address, and drop amounts.
7. `list_pending_approvals`: Query all payments awaiting human operator approval.
8. `get_audit_receipt`: Retrieve cryptographic SHA-256 audit receipt for any transaction.
9. `request_payment`: Propose an invoice payment to the policy referee.

### 3. Sample Antigravity Prompts
- *"Check the current Kitro treasury balance and active spending policy."*
- *"Here is an invoice from our cloud provider for 45 XRP to address r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt. Parse it and submit a payment request."*
- *"Show me all payment requests currently held in the approval queue."*

---

## SECTION F — CLAUDE DESKTOP MCP INTEGRATION GUIDE

### 1. Configuration Setup
In your Claude Desktop configuration file (`claude_desktop_config.json`):
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the Kitro MCP server:
```json
{
  "mcpServers": {
    "kitro": {
      "command": "pnpm",
      "args": ["--prefix", "/ABSOLUTE/PATH/TO/kitro", "--filter", "@kitro/mcp", "start"],
      "env": {
        "KITRO_API_URL": "http://localhost:8787"
      }
    }
  }
}
```

### 2. Verification in Claude Desktop
1. Restart Claude Desktop.
2. Look for the hammer icon in the prompt box; verify 9 tools under `kitro` are visible.
3. Ask Claude: *"What is the policy limit on our Kitro treasury?"*
4. Claude will call `get_spending_policy` and return the structured mandate limits.

---

## SECTION G — CHATGPT & REMOTE HTTP / SSE INTEGRATION

Kitro includes a high-performance Streamable HTTP and Server-Sent Events (SSE) server (`apps/mcp/src/http.ts`) running on port 3001.

### 1. Starting the Remote MCP Server
```bash
pnpm dev:mcp:http
# Server runs on http://localhost:3001
```

### 2. Supported Endpoints
- **Health Check:** `GET http://localhost:3001/health`
- **JSON-RPC 2.0 Endpoint:** `POST http://localhost:3001/mcp`
- **SSE Stream Endpoint:** `GET http://localhost:3001/sse`
- **SSE Message Handler:** `POST http://localhost:3001/message?sessionId={id}`

### 3. Testing JSON-RPC via cURL
Query treasury status directly via HTTP POST:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_treasury_status",
      "arguments": {}
    }
  }'
```

---

## SECTION H — CRYPTOGRAPHIC & LIVE TESTNET VERIFICATION EVIDENCE

Every claim in this report has been forensically executed and verified on the public XRPL Testnet:

### 1. Verified Account Addresses
| Account Role | Public XRPL Address | Testnet Balance | On-Ledger Quorum Weight |
| :--- | :--- | :--- | :--- |
| **Treasury / Operator** | `rhdpnnEnBGUfXj76fU7ttkNKRJevqbLRqn` | 99.98 XRP | Quorum Required = 2 |
| **Agent Signer** | `rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw` | 100.00 XRP | Weight = 1 |
| **Policy Signer** | `rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js` | 100.00 XRP | Weight = 1 |
| **Verified Supplier** | `r3N64mq5qsbNpTaj8VdsU3LgfvAMXb2smt` | 100.02 XRP | N/A (Destination) |

### 2. Validated On-Ledger Transactions

#### A. SignerListSet Configuration Transaction
- **Transaction Hash:** `958A04C020F7F955BE6C8D4BF55DB2C73D6B5613E119A9D871ECE1225DCB5DFD`
- **Ledger Sequence:** Validated on XRPL Testnet
- **Result:** `tesSUCCESS`
- **Explorer Link:** [Inspect SignerListSet on XRPL Testnet Explorer](https://testnet.xrpl.org/transactions/958A04C020F7F955BE6C8D4BF55DB2C73D6B5613E119A9D871ECE1225DCB5DFD)

#### B. Valid 2-of-2 Multisigned Payment Transaction
- **Transaction Hash:** `72B76A2830976A704B2F980AB93AE3D5F42BC3A30193C52A1071AD7A781A23D9`
- **Ledger Sequence:** `22300009`
- **Payment Amount:** 10,000 drops (0.01 XRP)
- **Signers Included:**
  1. `rGEHsFSihK2PWcsLE7Bq9i1NkZkbfnKkZw` (Agent Signer)
  2. `rNVkiZXr5xwfHu4SgqAvFw355LqFjJf6Js` (Policy Signer)
- **Fee Paid:** 36 drops (multisig fee multiplier satisfied)
- **Result:** `tesSUCCESS`
- **Explorer Link:** [Inspect 2-of-2 Payment on XRPL Testnet Explorer](https://testnet.xrpl.org/transactions/72B76A2830976A704B2F980AB93AE3D5F42BC3A30193C52A1071AD7A781A23D9)

### 3. Automated Test Execution Results

#### A. Playwright Browser E2E Suite (`apps/dashboard/tests/e2e.spec.ts`)
```
Running 8 tests using 1 worker
  ok 1 [chromium] › 1. Landing page renders correct product positioning and navigates to onboarding & dashboard (23.8s)
  ok 2 [chromium] › 2. Onboarding wizard guides through 7 setup steps (8.6s)
  ok 3 [chromium] › 3. Treasury overview displays balance, capacity, and active signers (21.4s)
  ok 4 [chromium] › 4. Invoices page extracts structured data and evaluates with policy referee (11.3s)
  ok 5 [chromium] › 5. Approvals queue displays held payments requiring human operator authorization (9.0s)
  ok 6 [chromium] › 6. Policy page displays active spending limits, caps, and allowlist rules (6.0s)
  ok 7 [chromium] › 7. Audit page displays cryptographic audit receipts and verifiable hashes (10.4s)
  ok 8 [chromium] › 8. Settings page displays network connection, multisig quorum, and integration information (8.8s)

  8 passed (5.3m)
```

#### B. Unit and Integration Test Breakdown (119/119 Passing)
- `@kitro/core`: 29 passing tests (schemas, cryptographic receipt generation, canonical hashing).
- `@kitro/rules`: 22 passing tests (deterministic policy referee, spending caps, daily spend capacity).
- `@kitro/xrpl`: 34 passing tests (2-of-2 multisigning, SignerListSet, ledger submit, reject scenarios).
- `@kitro/db`: 1 passing test (PostgreSQL persistence & Drizzle ORM schema validation).
- `@kitro/agent`: 8 passing tests (Claude invoice extraction & structured prompt handling).
- `@kitro/mcp`: 13 passing tests (9 MCP tools, stdio & HTTP/SSE transport execution).
- `@kitro/policy-service`: 12 passing tests (Hono REST endpoints, reservation lifecycle, approval queue).

---

## SECTION I — REMAINING LIMITATIONS & PRODUCTION ROADMAP

Kitro is a fully operational, end-to-end verified application on the XRPL Testnet. Before deploying to XRPL Mainnet with high-value commercial treasuries, the following production roadmap items should be addressed:

### 1. Hardware Security Module (HSM) Key Storage
- **Current Testnet State:** Signer private keys are loaded from environment variables into isolated service memory.
- **Production Requirement:** Policy Signer keys must be hosted in a Cloud HSM (AWS CloudHSM, Google Cloud KMS, or Azure Key Vault) or hardware secure enclave (Nitro Enclave) to eliminate key extraction risks.

### 2. Formal Smart Contract / Multisig Audit
- While XRPL multisigning is enforced natively on the ledger protocol layer (eliminating EVM smart contract vulnerabilities), the policy referee service and key management infrastructure require independent SOC 2 Type II and third-party cryptographic security auditing.

### 3. Disabling Treasury Master Key
- Once the treasury operator establishes the `SignerListSet`, the operator should submit an `AccountSet` transaction with `asfDisableMaster`. This permanently revokes single-key control, making the 2-of-2 quorum the only mathematical authority capable of debiting the account.

### 4. Enterprise ERP & Invoicing Connectors
- Production roadmap includes direct inbound webhook connectors for SAP, NetSuite, QuickBooks, and Workday, allowing invoices to automatically stream into Kitro for AI extraction and policy evaluation without manual text pasting.

---
**Kitro Architecture Team**  
*Built for the XRPL Hackathon — Verified on Ledger.*