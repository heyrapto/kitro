# KITRO — SECURITY ARCHITECTURE, BOUNDARIES & PRODUCTION LIMITATIONS
**Classification:** Security Architecture Specification & Risk Disclosure  
**Platform Version:** 0.1.0-testnet  
**Official Repository:** `https://github.com/heyrapto/kitro`  
**Ledger Target:** XRPL Testnet Only (Mainnet Disabled)

---

## 1. OFFICIAL SECURITY GOVERNANCE STATEMENT

> **"Routine agent-initiated payments require both the agent signer and independent policy signer. The treasury operator retains a separate master-key recovery capability in the current Testnet configuration."**

### Master Key Governance Disclosure
In this Testnet development release, the treasury account's master private key is preserved for operator setup, account funding, and emergency recovery. Consequently:
- Routine transactions initiated through the AI workflow or MCP require the **2-of-2 multisig quorum** (Agent Signer + Policy Referee).
- The treasury operator's master key *can* technically authorize a transaction independently of the signer quorum if used directly by the operator.
- **Why it is not disabled tonight:** Executing `AccountSet` with `asfDisableMaster` is an irreversible on-ledger operation. If the signer quorum becomes unavailable or misconfigured without a thoroughly audited key recovery ceremony, treasury funds would be permanently trapped. In production, disabling the master key will follow an institutional multi-party governance protocol.

---

## 2. THE THREE SECURITY LAYERS

### Layer 1: Prompt & Extraction Boundary (AI Layer)
- AI agents (Claude, GPT, Gemini) operate strictly as **untrusted data interpreters**.
- The AI agent parses text, extracts vendor names and amounts, and proposes structured payment requests.
- **Key Invariant:** The AI Agent is NEVER provisioned with treasury master keys, policy referee seeds, or arbitrary signing authority.

### Layer 2: Deterministic Policy Referee (Authorization Layer)
- An isolated microservice (`apps/policy-service`) running independently of the AI agent.
- Evaluates transactions purely against mathematical rules encoded in the spending mandate:
  - Per-Payment Maximum Cap
  - 24-Hour Rolling Aggregate Spend Limit
  - Verified Supplier Allowlist
  - Auto-Approval vs Human Escalation Threshold
- Evaluates deterministically with **zero LLM dependencies** in the critical authorization path.
- Signs decision receipts with an Ed25519 keypair only when policies evaluate to `allow`.

### Layer 3: XRPL Protocol Consensus (Settlement Layer)
- Enforced at the base protocol consensus level by the XRP Ledger.
- `SignerListSet` mandates a `SignerQuorum` of `2`.
- Agent Signer has Weight `1`.
- Policy Signer has Weight `1`.
- Unless both valid signatures are provided on the exact same transaction fields, XRPL validator nodes reject the transaction with `tefBAD_QUORUM`.

---

## 3. MODEL CONTEXT PROTOCOL (MCP) SECURITY

### A. Loopback Binding & Authentication Enforcement
- By default, the MCP Streamable HTTP server binds strictly to the loopback interface (`127.0.0.1`).
- If configured to bind to a non-loopback host (e.g. `0.0.0.0`), startup will immediately abort with a fatal error unless `KITRO_MCP_API_KEY` is set.
- Authentication uses constant-time token comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

### B. Read vs Write Separation
- 8 of the 9 MCP tools are purely read-only (`get_treasury_status`, `list_suppliers`, etc.).
- The single write tool, `request_payment`, only creates a proposal in the policy referee's evaluation pipeline. It cannot sign or broadcast transactions on its own.

---

## 4. REMAINING PRODUCTION LIMITATIONS & MAINNET ROADMAP

Kitro is fully functional and verified on the public XRPL Testnet. The following milestones must be completed before deploying to XRPL Mainnet for high-value commercial treasuries:

1. **Hardware Security Module (HSM) Key Management:**  
   In Testnet, signing seeds are loaded from environment variables into isolated process memory. In production, Policy Referee private keys must be hosted in Cloud HSMs (AWS CloudHSM, Google Cloud KMS, or Azure Key Vault) or hardware enclaves (AWS Nitro Enclaves) with non-exportable private keys.
2. **Disabling Treasury Master Key (`asfDisableMaster`):**  
   Once multi-party cold recovery arrangements (e.g. 3-of-5 institutional recovery signers) are verified, an `AccountSet` transaction will disable the treasury master key, making the 2-of-2 quorum the *only* mathematical mechanism capable of debiting the account.
3. **Formal Cryptographic & Security Audit:**  
   While XRPL native multisigning eliminates EVM smart contract vulnerability classes, the policy evaluation engine, cryptographic receipt generator, and API authentication layer require third-party SOC 2 Type II and penetration testing audits.
4. **ERP & Accounting Connectors:**  
   Production deployments will integrate direct OAuth2/webhook connectors for SAP, NetSuite, QuickBooks, and Workday to automate invoice intake without manual text input.
