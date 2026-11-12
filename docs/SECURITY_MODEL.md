# Security model

## Assets

1. The money in the treasury account.
2. The operator's keys (master key, mandate-signing key).
3. The mandate (the rules).
4. Escrow fulfillments (they release escrows).
5. The audit trail.

## Who holds what

| Secret | Holder | Never held by |
| --- | --- | --- |
| Treasury master key | Operator, offline or in a browser wallet | Agent, policy service, dashboard server |
| Agent signing key | Agent | Policy service, dashboard |
| Policy signing key | Policy service | Agent, dashboard |
| Policy claim key | Policy service | Agent |
| Relayer key | Policy service | Agent (it holds only fee money) |
| Fulfillments | Policy service, encrypted | Agent |

## Compromise scenarios

| If this is compromised... | The attacker can... | What still stops them |
| --- | --- | --- |
| **Agent** (key, prompt injection, bad model output) | Ask for payments. Sign what they ask for. | Policy service rules, signer quorum, channel caps. Agent alone can't submit a treasury payment. |
| **Invoice text** (injection, fake address) | Mislead the agent | Agent extracts to a schema. Payee comes from supplier records. Address change is held. Unknown payee goes to escrow. |
| **Policy service alone** | Sign channel claims up to each channel's funded cap, for that channel's fixed payee. Refuse or delay payments. | Channel cap and payee are ledger-enforced. It cannot make a treasury payment without the agent's signature. |
| **Agent and policy service together** | Move the treasury balance with the multisig route | Treasury holds only a small working float. Operator can replace the signer list with the master key. Alerts on large outflows. |
| **Dashboard** | Show wrong data. Ask the operator to sign something. | The dashboard holds no keys. The wallet shows what is being signed. Mandates must verify against the operator key. |
| **Database** | Edit records, hide history | Receipts are signed. Hashes sit in on-ledger memos. Ledger state is the source of truth for money. |
| **Operator key lost** | Nobody can change limits | Keep a recovery plan: a second operator key under a signer list on the treasury. [decide before mainnet] |

## Rules we hold ourselves to

1. **Re-derive before signing.** The service builds the expected fields from the approved request and compares every one.
2. **Fail closed.** Errors mean "no".
3. **Idempotency.** `invoiceId` per payee is unique. A retry never pays twice.
4. **One writer for state.** The policy service writes decisions. The agent can't.
5. **Mandate versions only go up.** Replays are rejected.
6. **No secrets in logs, memos or the dashboard.**
7. **Fee ceiling.** The service refuses to co-sign a transaction whose fee is above a set limit.
8. **Small float.** The treasury holds what is needed for the coming period, not the company's savings.
9. **Rate limits** on agent routes. Alert when refusals spike. It may mean something is probing.
10. **Separate accounts per network.**

## Not solved in v1 (say this out loud)

- The policy service is a trust point. Run it separately, log it, monitor it.
- Daily totals are service-enforced.
- No formal audit. Testnet only.
- Delivery verification is only as good as the verifier you plug in.
