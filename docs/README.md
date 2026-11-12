# Kitro docs

Kitro is a treasury agent for businesses on the XRP Ledger. An AI agent requests payments. A person sets the rules. The XRPL and an independent policy service enforce them.

> **Status: design docs.** Written before the code. When the code and a doc disagree, fix whichever is wrong and record the reason in an ADR.

## Reading order

| # | File | Read it to learn |
| --- | --- | --- |
| 1 | [ARCHITECTURE.md](./ARCHITECTURE.md) | The parts, who trusts whom, and how a payment flows |
| 2 | [TECH_STACK.md](./TECH_STACK.md) | What we use (Next.js, TypeScript, xrpl.js, ...) and why |
| 3 | [CODE_STRUCTURE.md](./CODE_STRUCTURE.md) | The monorepo layout and what each folder owns |
| 4 | [BUILD_PLAN.md](./BUILD_PLAN.md) | What to build first, in order, with checkpoints |
| 5 | [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | Step-by-step build with code |
| 6 | [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) | Mandate format, policy rules, API, data model, state machines |
| 7 | [XRPL_PRIMITIVES.md](./XRPL_PRIMITIVES.md) | How we use channels, multisig and escrow, with gotchas |
| 8 | [SECURITY_MODEL.md](./SECURITY_MODEL.md) | Threats and what limits the damage |
| 9 | [EDGE_CASES.md](./EDGE_CASES.md) | Things that will go wrong, and the planned response |
| 10 | [TESTING_AND_DEMO.md](./TESTING_AND_DEMO.md) | Test plan, demo script, judging checklist |
| 11 | [GO_TO_MARKET.md](./GO_TO_MARKET.md) | Customer, pain, pricing, pitch |
| - | [adr/](./adr/README.md) | Why we chose what we chose |

## Words used everywhere

- **Operator:** the person who owns the money and the rules.
- **Agent:** the AI that reads invoices and *requests* payments.
- **Policy service:** a separate service that checks each request and co-signs. The agent can't change it.
- **Mandate:** the operator's signed list of limits.
- **Treasury account:** the XRPL account that holds the working money. It needs two signatures.
- **Budget channel:** an XRPL Payment Channel funded for one routine supplier.
- **Escrow route:** how a first-time supplier gets paid.

## One rule

**The agent proposes. Something it doesn't control disposes.** If a feature lets the agent approve its own payment, it is a bug.
