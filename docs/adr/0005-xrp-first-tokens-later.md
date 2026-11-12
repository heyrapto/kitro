# 0005: XRP first, tokens later

**Context.** The workshop recommended MPTs over IOUs for new token projects, and RLUSD is relevant to businesses. But token escrow and token channels add scope and Testnet risk.

**Decision.** v1 supports XRP only, in drops. Tokens (RLUSD, MPT) are planned after the core flow works.

**Consequences.**
- Fewer unknowns while building the limits.
- Caps are in drops, so their fiat value moves. The dashboard shows an estimate and the operator can update caps.
- The mandate and rules use `...Drops` field names. A later change adds an asset field (a new mandate version).
