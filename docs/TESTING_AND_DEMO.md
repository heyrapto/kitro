# Testing and demo

## Test layers

| Layer | Tooling | What it proves |
| --- | --- | --- |
| Unit | Vitest | The rules engine, mandate hashing, amount parsing, memo encoding |
| Integration | Vitest + Postgres | Daily-cap race, reservations, idempotency |
| Ledger | Testnet scripts | Multisig, channels, escrow behave as designed |
| End to end | `pnpm testnet:e2e` | Agent, service and ledger together |
| Red team | `apps/agent` red-team mode | The limits hold against a misbehaving agent |

## Acceptance checklist (all on Testnet, twice in a row)

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | Agent alone signs a treasury Payment | Rejected by the ledger |
| 2 | Policy service alone signs a treasury Payment | Rejected by the ledger |
| 3 | In-limit payment to a known supplier (multisig route) | Paid. Receipt and memo hash present |
| 4 | In-limit payment to a channel supplier | Claim signed and redeemed |
| 5 | Claim above channel funded amount | Redemption fails |
| 6 | Payment over per-payment cap | Refused with `OVER_PER_PAYMENT_CAP` |
| 7 | Two concurrent payments that together exceed the daily cap | Exactly one succeeds |
| 8 | Duplicate invoice | Refused |
| 9 | First-time supplier | Escrow created. Released after delivery verified |
| 10 | First-time supplier, delivery never verified | Funds return after the deadline |
| 11 | Payee address changed | Held. Operator approves or rejects |
| 12 | Payment above the approval threshold | Held |
| 13 | Operator raises the cap (new signed mandate) | Previously refused payment now clears |
| 14 | Mandate edited in the database | Service refuses everything |
| 15 | Old mandate version resubmitted | Rejected |
| 16 | Operator presses pause | Next request refused with `PAUSED` |
| 17 | Injected invoice text | Ignored. No payment to the injected address |
| 18 | Service stopped | Nothing paid, agent reports error |

## Demo script (about 90 seconds)

Set up before: operator wallet connected, treasury funded, one supplier on a channel, one on the multisig route, a second "new" supplier ready, the red-team script ready.

1. **Say the customer.** "[Named customer] pays [N] suppliers every [period]. Today every payment waits for a person."
2. **Routine payment.** The agent reads an invoice and pays a known supplier. Show the transaction on the explorer.
3. **The block.** Run the red-team script: the agent tries to overspend. Show the refusal and the reason code. Say: "The agent wanted to. The ledger and the service said no."
4. **The ledger says no.** Show the test where the agent signs alone and the transaction is rejected.
5. **New supplier.** Pay a first-time supplier into escrow. Mark delivery verified. Show the release.
6. **Operator control.** In the dashboard, raise the cap, sign, save. Re-run the earlier payment. It clears.
7. **Audit.** Open the audit page. Show a receipt and the matching memo on the ledger.
8. **Close.** "Agents can already pay. Kitro makes sure they stay inside the rules."

## Judging checklist (from the challenge)

- [ ] At least one autonomous testnet transaction by the agent (steps 2 and 5)
- [ ] Limits enforced where the agent can't override (ledger and service, steps 3 and 4)
- [ ] A human sets or changes limits outside the agent (step 6)
- [ ] A named customer and a real pain point (step 1, GO_TO_MARKET.md)
- [ ] A go-to-market plan (GO_TO_MARKET.md)
- [ ] "Would your CFO sign off?" answered by the blocked payment and the audit trail

## What to avoid on stage

- Showing anything simulated without saying so
- A demo that only works on the happy path
- Long explanations of XRPL internals. Show the result, then offer detail
