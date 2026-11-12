# 0004: Signed mandates

**Context.** The human must be able to set and change limits outside the agent, and the service must be able to prove the limits came from them.

**Decision.** The mandate is canonical JSON (RFC 8785) hashed with SHA-256 and signed by the operator's key. The service accepts only a valid signature, from the configured operator, with a higher version.

**Options for the browser signature.**
1. Wallet "sign message" if the wallet supports it.
2. Anchor the hash on-ledger: the operator submits a transaction with the mandate hash in a memo, and the service reads it. Works with any wallet.
3. Dev only: sign with a seed from a script.

**Consequences.**
- A database edit invalidates the mandate and the service refuses everything.
- Version numbers prevent replaying old, looser mandates.
- Pick option 1 or 2 early. Don't discover wallet limits at the end.
