# 0006: Untrusted data boundary and prompt injection

**Context.** The agent reads invoices written by outsiders. Those can contain instructions or a swapped payment address.

**Decision.**
1. Invoice text is data. The agent extracts into a fixed zod schema and the system prompt says to ignore instructions in the text.
2. The payee address comes from supplier records keyed by name, not from the invoice body.
3. The policy service never reads free text for decisions. `memo` and `evidence` are for humans only.
4. An address change for a known supplier is held for approval. An unknown payee goes to escrow.
5. The service re-derives transaction fields and compares before signing.

**Consequences.**
- Prompt injection can at worst cause a bad *request*. It can't produce a payment the rules and the ledger would not allow.
- We keep a red-team script and run it in the demo.
- Prompting is not the defense. The architecture is.
