# 0007: Small treasury float

**Context.** If the agent key and the policy key are both compromised, the multisig route can move the whole treasury balance.

**Decision.** The treasury holds only the working float for a period. The operator tops it up from a cold account. The dashboard shows float versus daily cap and warns when the float is much larger than needed.

**Consequences.**
- The worst case is bounded by the float, not by the company's savings.
- It adds an operational step (top-ups). That is acceptable and CFO-friendly.
