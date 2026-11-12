# XRPL primitives

What we use, which fields matter, and what trips people up. Confirm each against the current XRPL docs and your pinned `xrpl.js` before relying on it.

## 1. Signer list (multisig)

**Use:** the treasury account needs two signatures, so the agent can't pay alone.

- `SignerListSet` on the treasury: `SignerQuorum: 2`, entries for agent (weight 1) and policy service (weight 1).
- The operator keeps the **master key** (offline). The master key can still sign alone. That is how the operator changes the signer list and funds channels. The agent and service never hold it.
- A multisigned transaction has a `Signers` array and `SigningPubKey` empty. The fee is higher (base fee x (1 + number of signers)). Use `client.autofill(tx, signersCount)`.
- Both signers must sign the **identical** transaction (same `Sequence`, `Fee`, `LastLedgerSequence`).
- The signer list uses one owner reserve.

**Gotcha:** if you forget to cap `Fee` before co-signing, a signed transaction with a huge fee burns XRP. The service enforces a fee ceiling.

## 2. Payment Channel

**Use:** a funded budget for one routine supplier that the agent can't overdraw.

- `PaymentChannelCreate`: `Destination`, `Amount` (drops, the cap), `SettleDelay` (seconds), `PublicKey` (key that signs claims). Optional `CancelAfter`.
- We set `PublicKey` to the **policy service's claim key**. The service signs claims. The agent is not involved.
- A claim is signed off-ledger over `(channelId, cumulativeAmount)`. The **destination** redeems it with `PaymentChannelClaim` (`Balance`, `Amount`, `Signature`, `PublicKey`).
- Claims are **cumulative**. A claim for 5 XRP then 8 XRP means 8 XRP total, not 13. The service must track the running total and never sign a lower number or exceed the channel `Amount`.
- Top up with `PaymentChannelFund`. Close: the owner sends `PaymentChannelClaim` with `tfClose`; funds return after `SettleDelay`.
- Because a channel has one fixed destination, the **payee allowlist is enforced by the ledger** for this route.

**Gotchas:** the signing helper in `xrpl.js` (`signPaymentChannelClaim`) may expect the amount in XRP or drops depending on version. Test by signing, verifying (`verifyPaymentChannelClaim`) and redeeming a small claim on Testnet. Also: the supplier must submit the redemption. Suppliers who won't should use the multisig Payment route.

## 3. Escrow with a condition

**Use:** pay a first-time supplier only after delivery is checked.

- `EscrowCreate`: `Destination`, `Amount`, `Condition` (PREIMAGE-SHA-256, hex), `CancelAfter` (Ripple epoch seconds = Unix seconds - 946684800). A conditional escrow needs `CancelAfter` or `FinishAfter`.
- `EscrowFinish`: `Owner`, `OfferSequence` (the `Sequence` of the EscrowCreate), `Condition`, `Fulfillment`. **Anyone** may submit it, so the service's own relayer account sends it. It does not need treasury signatures. The fee is higher with a fulfillment.
- `EscrowCancel`: after `CancelAfter`, anyone can submit. Funds can only go back to the owner (the treasury).
- XRPL cannot cancel before `CancelAfter`, so a failed delivery waits for the deadline.
- The fulfillment is secret until used. Keep it in the service, encrypted.

## 4. Memos

- `Memos: [{ Memo: { MemoType: hex, MemoData: hex } }]`. Both are hex strings. Keep them small.
- We write `kitro/receipt` and the receipt hash. Never put invoice text or personal data in a memo. Memos are public forever.

## 5. Practical rules

- Always wait for a **validated** result before saying "paid". Use `submitAndWait`.
- Set `LastLedgerSequence` (autofill does). If a transaction expires, treat it as not sent and retry with a new sequence.
- Concurrent transactions from one account collide on `Sequence`. Either serialize submissions per account with a queue, or use Tickets.
- Reserves: every signer list, channel and open escrow adds to the owner reserve. Keep the treasury funded above the reserve.
- Addresses with `RequireDest` need a `DestinationTag`. Accounts with `DepositAuth` may reject payments.
- Use separate accounts per network.
- **Float:** keep only a small working balance in the treasury. The multisig route can reach the whole balance, so top up from a cold account.
