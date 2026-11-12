# 0002: Three payment routes

**Context.** A Payment Channel has one fixed destination and the supplier must redeem claims. Not every supplier will do that, and some payees are new.

**Decision.** Use three routes: budget channel (integrated routine suppliers), multisig Payment (known payees), conditional escrow (new payees). Anything unusual goes to the approval queue.

**Consequences.**
- The channel route gives ledger-enforced caps and payees.
- The multisig route reaches suppliers who do nothing special, but relies on the policy service for caps.
- More routes means more code. If time is short, cut channels or escrow first; keep multisig.
