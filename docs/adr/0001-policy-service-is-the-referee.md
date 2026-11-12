# 0001: The policy service is the referee

**Context.** The challenge requires limits "somewhere the agent doesn't control". Some limits (per-payment cap, daily total, allowlists, approvals) can't be expressed on the ledger alone.

**Decision.** An independent policy service holds one of the two treasury signing keys. It runs the rules, holds the approval queue, and co-signs only what it re-derives from an approved request.

**Consequences.**
- The agent can never pay alone: the ledger rejects a transaction without the second signature.
- The service is a trust point. We document that and keep ledger-enforced limits (channel caps, escrow conditions) where possible.
- If the service is down, nothing is paid (fail closed).
