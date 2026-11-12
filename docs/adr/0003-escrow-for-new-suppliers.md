# 0003: Escrow for first-time suppliers

**Context.** Paying a supplier you have never paid is the riskiest moment. Fake invoices and changed bank details are common fraud.

**Decision.** A payee not in the mandate gets a conditional escrow (PREIMAGE-SHA-256 condition, `CancelAfter`). The policy service holds the fulfillment and releases it after delivery is verified. If not, funds return to the treasury after the deadline.

**Consequences.**
- The money is locked on the ledger, not in our database.
- Refunds wait for `CancelAfter` because XRPL can't cancel earlier.
- Anyone can submit `EscrowFinish`, so a relayer account sends it and needs no treasury key.
- The same pattern is used by the x402 `auth-capture` XRPL binding. We credit it and decide separately whether to reuse that package.
