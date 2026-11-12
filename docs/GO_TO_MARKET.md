# Go-to-market

Fill the brackets with a real person. The challenge asks for a customer you can name.

## Customer

**Who:** [Name, role, company]. Example shape: a finance lead at a small importer paying overseas suppliers every week.

**Their pain, in their words:** "[Quote or paraphrase after speaking to them.]"

**How they cope today:** manual approvals, spreadsheets, bank transfers that take days, trust in one person to click the right button.

**Why they can't just hand an agent a wallet:** one error or one fake invoice could empty it, and the board will not accept that.

## Value

| For | Gets |
| --- | --- |
| Finance lead | Routine payments done without waiting. Limits they set themselves. |
| CFO | A hard ceiling the agent cannot change. A signed record of every decision. |
| Auditor | Receipts matched to ledger memos. |
| Supplier | Faster, predictable payment. A way to get paid with proof. |

## Wedge

1. **Pilot:** one customer, small cap, routine suppliers only, new suppliers through escrow. Run on Testnet first, then a small mainnet float after review.
2. **Prove:** two weeks of logs. Show refused payments and the audit page.
3. **Widen:** raise limits as trust grows. Add more suppliers and an approval policy.

## Pricing (decide one)

- [Monthly fee per agent]
- [Small percentage per payment above a free tier]
- [Platform fee for accounting firms who run Kitro for many clients]

## Channels

- Accountants and bookkeepers who serve importers and trading firms
- Trade associations
- The XRPL builder community and Ripple's accelerator network
- Open-source SDK so other builders adopt the pattern

## Competition and answer

| Alternative | Why Kitro differs |
| --- | --- |
| Give the agent a wallet and trust it | No hard limit |
| Approve every payment by hand | No time saved |
| Bank-side spending controls | Slow, closed, no on-chain proof |
| Escrow-only agent payment tools (for buying data and APIs) | Protect the agent from sellers. Kitro also protects the company from its own agent |

## Risks to be honest about

- Suppliers must accept XRP or a supported token. Start with partners who do. RLUSD and MPT support are planned.
- The policy service is a trust point. Position it as an independent service you can host yourself.
- Regulatory and accounting treatment varies by country. [Talk to an adviser before mainnet.]

## Metrics

- Share of payments handled without a human
- Refusals caught (and what they would have cost)
- Time from invoice to paid
- Operator interventions per week (should fall)
