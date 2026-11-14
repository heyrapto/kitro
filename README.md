# Kitro

**Policy-Controlled Autonomous Treasury Infrastructure for Businesses on the XRP Ledger**

[![XRPL Testnet](https://img.shields.io/badge/XRPL-Testnet%20Verified-blue)](https://testnet.xrpl.org)
[![Multisig Quorum](https://img.shields.io/badge/Multisig-2--of--2%20Native%20Quorum-brightgreen)](#how-it-works)
[![MCP Ready](https://img.shields.io/badge/MCP-9%20Tools%20Active-purple)](#connecting-ai-assistants-via-mcp)
[![Tests Passing](https://img.shields.io/badge/Unit%20Tests-120%2F120%20Passing-success)](#testing--verification)
[![Playwright E2E](https://img.shields.io/badge/Playwright%20E2E-10%2F10%20Passing-success)](#testing--verification)
[![License](https://img.shields.io/badge/License-Apache%202.0-black)](#license)

> **"Let AI handle the work. Keep control of the money."**  
> *An AI agent may request a payment. It must never be allowed to authorize itself.*

---

## Table of Contents

- [The Problem: The Autonomous Agent Dilemma](#the-problem-the-autonomous-agent-dilemma)
- [How Kitro Works: Separation of Powers](#how-kitro-works-separation-of-powers)
- [Monorepo Architecture](#monorepo-architecture)
- [Quickstart: How to Run Kitro Locally](#quickstart-how-to-run-kitro-locally)
- [Testing & Forensic Verification](#testing--forensic-verification)
- [Connecting AI Assistants via MCP](#connecting-ai-assistants-via-mcp)
- [Live Testnet Proof & Transaction Evidence](#live-testnet-proof--transaction-evidence)
- [Complete Dashboard Walkthrough](#complete-dashboard-walkthrough)
- [Security Governance & Disclosure](#security-governance--disclosure)
- [License](#license)

---

## The Problem: The Autonomous Agent Dilemma

As modern enterprises deploy autonomous AI agents to manage accounts payable, cloud resources, and vendor disbursements, CFOs and finance teams face an unacceptable trade-off:

1. **Give agents direct wallet access:** The AI agent moves fast, but a single prompt injection attack, malformed invoice, or logic hallucination can drain the entire treasury in seconds.
2. **Require human sign-off on every transaction:** The company stays financially safe, but requiring an executive to manually approve every \$20 API or compute invoice creates a bottleneck that defeats the purpose of automation.

**Kitro eliminates this dilemma** by moving financial authorization *completely out of the AI agent's reach*.

---

## How Kitro Works: Separation of Powers

Kitro enforces a strict separation between **Intelligence**, **Authorization**, and **Settlement**:

```mermaid
sequenceDiagram
  autonumber
  actor Supplier as External Supplier
  actor Operator as Human Treasury Operator
  participant Agent as AI Execution Agent
  participant Policy as Independent Policy Referee
  participant XRPL as XRP Ledger Testnet

  Note over Operator,Policy: Step 0: Operator establishes spending mandate
  Operator->>Policy: Configure spending caps, daily limits & allowlisted suppliers

  Supplier->>Agent: Submits unstructured invoice (e.g. PDF / text)
  Agent->>Agent: Extracts vendor, destination address & drop amounts
  Agent->>Policy: Submits structured payment proposal (request_payment)

  Note over Policy: Step 2: Deterministic Policy Evaluation
  Policy->>Policy: Validates allowlist, per-payment cap & daily spending capacity

  alt Policy Decision: ALLOW (Within limits & allowlisted)
    Policy-->>Agent: Issues signed cryptographic decision receipt (SHA-256)
    Agent->>Agent: Signs transaction with Agent Key (Weight 1)
    Policy->>Policy: Co-signs transaction with Policy Key (Weight 1)
    Policy->>XRPL: Broadcasts 2-of-2 multisigned transaction
    XRPL-->>Supplier: Settle payment in 3 seconds (tesSUCCESS)
  else Policy Decision: HOLD (Exceeds approval threshold)
    Policy-->>Operator: Routes to Operator Approval Queue
    Operator->>Policy: Approves transaction in dashboard
    Policy->>XRPL: Co-signs and broadcasts 2-of-2 transaction
  else Policy Decision: REFUSE (Over cap or unknown payee)
    Policy-->>Agent: Rejection receipt issued; ZERO transaction sent to ledger
  end
```

### Mathematical Proof of Security
Settlement is enforced at the XRP Ledger consensus layer using a native `SignerListSet` on the treasury account:
- **SignerQuorum:** `2`
- **Agent Signer:** Weight `1`
- **Policy Signer:** Weight `1`

$$\text{Agent Alone}: \text{Weight } 1 < 2 \implies \mathbf{tefBAD\_QUORUM}\quad \text{(Ledger Rejection)}$$
$$\text{Policy Alone}: \text{Weight } 1 < 2 \implies \mathbf{tefBAD\_QUORUM}\quad \text{(Ledger Rejection)}$$
$$\text{Agent } + \text{ Policy}: 1 + 1 = 2 \ge \text{Quorum } 2 \implies \mathbf{tesSUCCESS}\quad \text{(Validated On-Ledger)}$$

Even if an AI agent is completely compromised, it has **zero mathematical ability** to debit the treasury without the independent policy referee's co-signature.

---

## Monorepo Architecture

Kitro is structured as a Turborepo monorepo with 10 workspace packages:

```
kitro/
├── apps/
│   ├── dashboard/          # Next.js 15 Operator Dashboard & Crossmark Web3 Wallet
│   ├── policy-service/     # Independent Hono REST API & Policy Referee (Port 8787)
│   ├── mcp/                # Model Context Protocol dual transport: STDIO & Streamable HTTP/SSE (Port 3001)
│   └── agent/              # Autonomous invoice processing agent with Claude structured extraction
├── packages/
│   ├── core/               # Domain models, Zod validation schemas, canonical config resolver, receipts
│   ├── rules/              # Pure deterministic evaluation engine (spending caps, daily capacity)
│   ├── xrpl/               # XRPL SDK wrapper (native multisig, SignerListSet, validated submissions)
│   ├── db/                 # Drizzle ORM schemas, PostgreSQL driver & persistent audit store
│   └── client/             # Strongly-typed TypeScript client for Kitro Policy Service
├── scripts/
│   ├── setup-testnet.ts    # Testnet faucet funding & on-ledger SignerListSet configuration
│   └── e2e.ts              # 6 live Testnet verification scenarios (ALLOW, HOLD, REFUSE, Bad Quorum)
└── docs/                   # Forensic audit reports, demo runbooks, and MCP setup guides
```

---

## Quickstart: How to Run Kitro Locally

### 1. Prerequisites
- **Node.js:** `>= 22.0.0`
- **pnpm:** `>= 10.0.0`
- **Git**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/heyrapto/kitro.git
cd kitro
pnpm install
```

### 3. Initialize Environment & Testnet Accounts
Kitro comes pre-configured with active, pre-funded XRPL Testnet accounts in `.env.example`. 

To generate a fresh set of Testnet accounts and automatically configure the 2-of-2 multisig signer list on the ledger:
```bash
pnpm --filter @kitro/scripts setup-testnet -- --fresh
```
*(This archives any existing `.env.local`, funds 4 accounts from the official Ripple faucet, sets up the `SignerListSet` on-ledger, and securely writes `.env.local` without ever printing private keys to your console).*

### 4. Start the Full Application Stack
Open three separate terminals in the repository root:

#### Terminal 1 — Policy Referee Microservice (Port 8787)
```bash
pnpm --filter @kitro/policy-service dev
# Output: [KITRO-POLICY] Referee service running on http://localhost:8787
```

#### Terminal 2 — Kitro Operator Dashboard (Port 3000)
```bash
pnpm --filter @kitro/dashboard dev
# Output: Ready in 1200ms at http://localhost:3000
```

#### Terminal 3 — Model Context Protocol (MCP) Server (Port 3001)
```bash
pnpm dev:mcp:http
# Output: [KITRO-MCP] Streamable HTTP Server starting on http://127.0.0.1:3001...
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser to start the guided onboarding and live demonstration.

---

## Testing & Forensic Verification

Run the full verification suite across all 10 workspaces:

```bash
# 1. TypeScript compilation check across all 10 workspaces
pnpm typecheck

# 2. ESLint static analysis across all workspaces
pnpm lint

# 3. Unit and integration test suite (120 tests passing)
pnpm test

# 4. Playwright End-to-End browser test suite (10 tests passing in Chromium)
pnpm --filter @kitro/dashboard test:e2e

# 5. Live XRPL Testnet 6-scenario verification suite
pnpm testnet:e2e

# 6. Next.js production build (17 routes compiled cleanly)
pnpm --filter @kitro/dashboard build
```

---

## Connecting AI Assistants via MCP

Kitro natively exposes **9 Model Context Protocol (MCP) tools** allowing assistants like Google Antigravity and Claude Desktop to safely inspect invoices, check treasury balances, and propose payments without ever receiving private keys:

| Tool Name | Type | Description |
| :--- | :--- | :--- |
| `get_treasury_status` | Read-only | Real-time on-ledger balance, quorum status, and daily capacity |
| `get_spending_policy` | Read-only | Active spending mandate rules, caps, and approval thresholds |
| `list_suppliers` | Read-only | All verified and allowlisted supplier addresses |
| `list_payment_requests` | Read-only | Recent payment proposals filtered by status (`received`, `held`, `approved`, `refused`) |
| `get_payment_status` | Read-only | On-ledger settlement status and transaction hash for a request |
| `read_invoice` | Read-only | Structured extraction of vendor, address, and XRP drop amounts from text |
| `list_pending_approvals`| Read-only | Payment requests held by referee requiring human approval |
| `get_audit_receipt` | Read-only | Cryptographic SHA-256 decision receipt and Ed25519 signature |
| `request_payment` | Controlled Write | Proposes an invoice payment to the policy referee |

### Google Antigravity Configuration
Add to your project's `.agents/mcp_config.json`:
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

### Claude Desktop Configuration
Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
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

### Sample Assistant Prompts
- *"Check my Kitro treasury balance, active signer quorum and remaining daily spending capacity."*
- *"Here is an invoice from our cloud provider for 0.01 XRP to rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze. Parse it and submit a payment request."*
- *"Show all payment requests currently held in the human operator approval queue."*

For detailed remote HTTP/SSE and ChatGPT instructions, see [`docs/CONNECT_KITRO_TO_AI.md`](./docs/CONNECT_KITRO_TO_AI.md).

---

## Live Testnet Proof & Transaction Evidence

All accounts and transactions are validated on the public XRP Ledger Testnet (`wss://s.altnet.rippletest.net:51233`):

### Participating Testnet Accounts
- **Treasury Vault (Operator):** [`rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk`](https://testnet.xrpl.org/accounts/rPZvtGrKJyN38wt6AFLLkZs6PbrqpDdHPk) (Balance: ~99.98 XRP, Quorum: 2)
- **Agent Signer (AI Execution):** [`rH3Gng7Nz9JhGPPpjjbDoQBATSDWjaEZSc`](https://testnet.xrpl.org/accounts/rH3Gng7Nz9JhGPPpjjbDoQBATSDWjaEZSc) (Weight: 1)
- **Policy Signer (Referee):** [`r4sML1TA1mqjEbtEBJ1PfwWNs9yy2djyNn`](https://testnet.xrpl.org/accounts/r4sML1TA1mqjEbtEBJ1PfwWNs9yy2djyNn) (Weight: 1)
- **Allowlisted Supplier:** [`rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze`](https://testnet.xrpl.org/accounts/rwVrsBE9iWVyNhtYVNhMmS2yyoQDM9oaze) (*Reliable Cloud Services Ltd*)

### Validated On-Ledger Transactions
1. **Multisig SignerListSet Transaction:**  
   Hash: [`71856854C8DEA4B67825FA5386883E54DCA48A2497FF36E2D8775F66A1884910`](https://testnet.xrpl.org/transactions/71856854C8DEA4B67825FA5386883E54DCA48A2497FF36E2D8775F66A1884910)  
   Ledger Sequence: `22305905` | Result: `tesSUCCESS`
2. **Executed 2-of-2 Multisign Payment:**  
   Hash: [`630D1C8B63B60F8AD9AB5953749823864AE9CA3CBC5C76866789AD8BF968695F`](https://testnet.xrpl.org/transactions/630D1C8B63B60F8AD9AB5953749823864AE9CA3CBC5C76866789AD8BF968695F)  
   Ledger Sequence: `22305935` | Result: `tesSUCCESS` | Fee: 36 drops | Amount: 0.01 XRP (10,000 drops)
3. **Cryptographic Decision Receipt:**  
   Canonical SHA-256 Digest: `95356118693E8A1A6324993CFBB72D1BA2455BE202AE7D88E4B5793C65DAE0C2`

---

## Complete Dashboard Walkthrough

The Kitro dashboard features a strict monochrome, high-contrast aesthetic (Apple / Linear standard) with 10 integrated views:

- **Landing Page (`/`):** Explains core positioning: *"Let AI handle the work. Keep control of the money."*
- **7-Step Onboarding Wizard (`/onboarding`):** Guides the operator through workspace setup, network selection (Testnet active, Mainnet locked), wallet connection (Crossmark or 1-click testnet treasury), balance check, 2-of-2 multisig model, spending mandate configuration, and readiness checklist.
- **Treasury Overview (`/dashboard`):** Real-time on-ledger balance, 24-hour spending limit, policy capacity, and 1-click **"Execute 2-of-2 Payment"** test button.
- **Invoice Intelligence (`/dashboard/invoices`):** 4 pre-loaded real-world invoice presets (Routine, High-Value, Over-Cap, Unknown Vendor) with AI extraction, policy evaluation, and live 2-of-2 multisig settlement.
- **Approval Queue (`/dashboard/approvals`):** Review payments placed in `held` status and co-sign directly from the dashboard.
- **Payment Registry (`/dashboard/payments`):** Auditable table of all received, held, approved, and refused payment requests with a clickable forensic detail drawer.
- **Policy Mandate Editor (`/dashboard/policy`):** Configure per-payment caps, daily limits, approval thresholds, and unknown payee routing rules.
- **Supplier Allowlist (`/dashboard/suppliers`):** Registry of approved vendor addresses with direct XRPL Explorer inspect links.
- **Cryptographic Audit Trail (`/dashboard/audit`):** Immutable log of canonical SHA-256 decision hashes, referee Ed25519 signatures, and validated ledger sequences.
- **Settings & Integration (`/dashboard/settings`):** Copyable configurations for Google Antigravity, Claude Desktop, and remote HTTP/SSE endpoints, plus full catalog of all 9 MCP tools.

---

## Security Governance & Disclosure

> **Official Security Statement:**  
> *"Routine agent-initiated payments require both the agent signer and independent policy signer. The treasury operator retains a separate master-key recovery capability in the current Testnet configuration."*

### Key Security Invariants
1. **Zero Custody in Browser:** Kitro never handles, prompts for, or stores private keys in the browser client.
2. **Deterministic Authorization:** The critical financial authorization path contains zero LLM dependencies; rules are evaluated purely by mathematical referee logic.
3. **No Secret Echoing:** If an environment variable is missing, startup fails with an explicit error without printing secrets.
4. **Testnet Scope Boundary:** Kitro is currently built for the public XRPL Testnet. Disabling the treasury master key on Mainnet (`asfDisableMaster`) will require a formal institutional multi-party recovery protocol.

For detailed risk models and security boundaries, see [`docs/SECURITY_AND_LIMITATIONS.md`](./docs/SECURITY_AND_LIMITATIONS.md).

---

## License

Apache-2.0 License. See `LICENSE` for details. Built natively for the **XRPL Hackathon 2026**.
