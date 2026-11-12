# Build plan

Ordered so you always have a working demo, even if time runs out. Times assume a 36-hour hackathon. Scale them if yours is different.

**Build the blocked-overspend demo first.** It is the proof that the limits are real. Everything else supports it.

## Phase 0: Ground (hours 0-3)

- [ ] Monorepo, TypeScript, lint, `.env.example`
- [ ] `scripts/setup-testnet.ts`: fund four wallets (operator, agent, policy, supplier) with the faucet
- [ ] A script that sends one plain Payment on Testnet

**Checkpoint:** one transaction hash you can open on a Testnet explorer.

## Phase 1: The ledger enforces something (hours 3-9)

- [ ] Treasury signer list: agent weight 1, policy weight 1, quorum 2 (`SignerListSet`)
- [ ] Multisigned Payment: both sign, combine, submit
- [ ] Prove the negative: a Payment signed by the agent alone is **rejected**
- [ ] Payment Channel: create, sign a claim, redeem it, prove an over-cap claim fails

**Checkpoint:** two ledger-level "no" results you can show. This alone meets the "limits where the agent can't override" requirement.

## Phase 2: The rules engine and policy service (hours 9-17)

- [ ] `packages/rules`: `evaluate()` and tests for every rule
- [ ] Mandate: schema, canonical hash, sign, verify
- [ ] Policy service: `/mandate`, `/requests`, decisions table, signed receipts
- [ ] Rebuild-and-compare before co-signing
- [ ] Daily spend reserved inside a DB transaction

**Checkpoint:** run the agent against the service: an in-limit request is paid, an over-limit request is refused.

## Phase 3: Operator control (hours 17-24)

- [ ] Dashboard: sign-in with wallet challenge
- [ ] Mandate editor: change a limit, sign it, see the version go up
- [ ] Approval queue: approve/reject unusual payments
- [ ] Pause button
- [ ] Demo moment: operator raises the limit, the same payment clears

**Checkpoint:** requirement 3 done ("a human sets or changes limits outside the agent").

## Phase 4: New suppliers and audit (hours 24-30)

- [ ] Escrow route with a condition, finisher worker, canceller worker
- [ ] A simple delivery verifier (invoice and purchase order match, or a "goods received" button)
- [ ] Audit page: receipts, memo hash, link to each transaction

## Phase 5: Polish and pitch (hours 30-36)

- [ ] README, demo video, deck
- [ ] Go-to-market slide with a named customer
- [ ] Rehearse the demo script (TESTING_AND_DEMO.md) twice
- [ ] Freeze features at hour 32. No new code after that.

## If you run out of time, cut in this order

1. Escrow route (keep the slide, mark it as planned)
2. Budget channel route (keep multisig)
3. Dashboard polish
4. **Never cut:** multisig rejection proof, blocked overspend, operator changes a limit.

## Risks to check early

| Risk | Check at |
| --- | --- |
| Multisig fee or sequence errors | Phase 1 |
| Condition/fulfillment encoding | Phase 4, but test the helper in Phase 1 |
| Wallet signing in the browser | Phase 3 start. Have the dev-seed fallback ready |
| Testnet faucet or node outage | Phase 0. Keep funded spare wallets |
