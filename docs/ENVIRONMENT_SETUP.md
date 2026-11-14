# KITRO — ENVIRONMENT CONFIGURATION & SETUP GUIDE
**Platform Version:** 0.1.0-testnet  
**Official Repository:** `https://github.com/heyrapto/kitro`  
**Configuration File:** `.env.local` (Root directory, strictly gitignored)

---

## 1. CANONICAL ENVIRONMENT VARIABLES CONTRACT

Kitro uses a centralized, Zod-validated configuration resolver (`packages/core/src/config.ts`). The table below outlines the canonical variable names, supported backward-compatibility aliases, and security classifications:

| Canonical Variable Name | Legacy / Alias Fallback | Type & Default | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `XRPL_URL` | `XRPL_RPC_URL`, `NEXT_PUBLIC_XRPL_WS` | `string` (`wss://s.altnet.rippletest.net:51233`) | **Public** | WebSocket endpoint of target XRPL node |
| `TREASURY_ADDRESS` | `OPERATOR_ADDRESS` | `string` | **Public** | Classic XRPL address of corporate treasury |
| `AGENT_ADDRESS` | `AGENT_SIGNER_ADDRESS` | `string` | **Public** | Classic XRPL address of AI execution agent |
| `POLICY_ADDRESS` | `POLICY_SIGNER_ADDRESS` | `string` | **Public** | Classic XRPL address of independent policy referee |
| `SUPPLIER_ADDRESS` | `NEXT_PUBLIC_SUPPLIER_ADDRESS` | `string` | **Public** | Classic XRPL address of allowlisted vendor |
| `TREASURY_SEED` | — | `string` (Ed25519 seed) | **SECRET** | Master recovery seed for setup / recovery |
| `AGENT_SEED` | `AGENT_SIGNER_SEED` | `string` (Ed25519 seed) | **SECRET** | Private key for Signer 1 (Weight 1) |
| `POLICY_SEED` | `POLICY_SIGNER_SEED` | `string` (Ed25519 seed) | **SECRET** | Private key for Signer 2 (Weight 1) |
| `SUPPLIER_SEED` | — | `string` (Ed25519 seed) | **SECRET** | Test vendor wallet seed (Testnet only) |
| `PORT` | — | `number` (`3000`) | **Public** | Dashboard HTTP port |
| `POLICY_SERVICE_PORT` | — | `number` (`8787`) | **Public** | Policy Referee REST API port |
| `MCP_PORT` | — | `number` (`3001`) | **Public** | MCP Streamable HTTP / SSE port |
| `KITRO_API_URL` | `POLICY_SERVICE_URL` | `string` (`http://localhost:8787`) | **Public** | Endpoint used by MCP / Dashboard to call policy |
| `KITRO_MCP_API_KEY` | — | `string` (optional in dev) | **SECRET** | Bearer token required for remote HTTP MCP access |
| `KITRO_ALLOWED_ORIGINS` | — | `string` (comma-separated) | **Public** | Allowed CORS origins for remote web clients |
| `DATABASE_URL` | — | `string` (optional) | **SECRET** | PostgreSQL connection string for persistence |

---

## 2. SERVICE CONFIGURATION REQUIREMENTS

### A. Dashboard (`apps/dashboard`)
- **Required:** `XRPL_URL`, `TREASURY_ADDRESS`, `AGENT_ADDRESS`, `POLICY_ADDRESS`, `SUPPLIER_ADDRESS`
- **Optional for direct 1-click settlement:** `AGENT_SEED`, `POLICY_SEED`
- *Note:* In pure operator mode with Crossmark, private keys are never handled by the browser client.

### B. Policy Referee Service (`apps/policy-service`)
- **Required:** `POLICY_SEED`, `XRPL_URL`
- **Optional:** `DATABASE_URL`, `PORT` (defaults to 8787)

### C. MCP Server (`apps/mcp`)
- **Required:** `KITRO_API_URL` (points to `http://localhost:8787`)
- **Required if exposed beyond loopback:** `KITRO_MCP_API_KEY`
- **Optional:** `MCP_PORT` (3001), `KITRO_ALLOWED_ORIGINS`

### D. Setup & E2E Scripts (`scripts/`)
- **Required for Setup:** `XRPL_URL`
- **Required for E2E:** `TREASURY_SEED`, `AGENT_SEED`, `POLICY_SEED`, `SUPPLIER_SEED`

---

## 3. HOW TO INITIALIZE FRESH TESTNET CREDENTIALS

To generate fresh, pre-funded wallets and automatically write `.env.local` without ever exposing private keys to terminal logs:

```bash
# Run automated setup with --fresh flag
pnpm --filter @kitro/scripts setup-testnet -- --fresh
```

This performs the following steps:
1. Archives any existing `.env.local` to `.env.local.backup-<timestamp>`.
2. Requests 100 XRP each from the official Ripple Testnet faucet for Treasury, Agent, Policy, and Supplier accounts.
3. Automatically sets up the 2-of-2 multisig quorum on the treasury account (`SignerListSet`).
4. Writes the canonical variables to `.env.local`.

---

## 4. SECURITY & CREDENTIAL HANDLING RULES

1. **Never Commit Secrets:** `.env.local`, `.env.*.local`, and all wallet seeds are strictly ignored by `.gitignore`.
2. **Template Only in Git:** `.env.example` contains only variable keys and empty placeholders.
3. **No Secret Echoing:** If a required variable is missing, startup fails with an error indicating the variable name, without printing any secret values:
   ```
   KitroConfigurationError: Missing required environment variable(s): AGENT_SEED, POLICY_SEED.
   Please configure them in .env.local or refer to docs/ENVIRONMENT_SETUP.md.
   ```
4. **Conflict Detection:** If both a canonical variable (e.g. `AGENT_SEED`) and its legacy alias (e.g. `AGENT_SIGNER_SEED`) are set with differing values, startup is aborted immediately to prevent accidental state divergence.
