# Tech stack

Chosen for speed in a short build, a clean demo, and a clear separation between "the agent" and "the thing that says no".

| Layer | Choice | Why |
| --- | --- | --- |
| Language | **TypeScript** everywhere | One language across dashboard, service, agent and scripts. Shared types for the mandate and API. |
| Dashboard | **Next.js 16 (App Router)** | Your choice. Server components for data, route handlers for operator auth, easy deploy on Vercel. |
| UI | **Tailwind CSS + shadcn/ui** | Fast, clean tables, dialogs and forms. |
| Policy service | **Hono** on Node 22 | Small, fast, separate process. It must NOT be a Next.js route, because it has to be independent of the app the agent can reach. |
| Validation | **Zod** | One schema for API input, mandate, and the agent's extraction output. |
| XRPL | **xrpl.js** (pin the exact version you test) | Official SDK: autofill, sign, multisign, submitAndWait. |
| Crypto | **ripple-keypairs** (via xrpl) and **five-bells-condition** | Sign and verify mandates. Create escrow conditions and fulfillments. |
| Canonical JSON | **canonicalize** (RFC 8785) | Same bytes on every machine, so signatures verify. |
| Database | **Postgres** (Neon or Supabase) + **Drizzle ORM** | Transactions and row locks for the daily-cap race. SQLite is fine for local dev. |
| Agent | **Vercel AI SDK** with the **Anthropic** provider | Structured extraction with a Zod schema. Model name comes from an env var. |
| Operator wallet | **Crossmark** or **GemWallet** in the browser; Xaman as an option | Operator signs in the browser, so the dashboard never sees the key. Dev-only fallback: a seed in `.env`. |
| Monorepo | **pnpm workspaces + Turborepo** | Shared `packages/`, one command to build all. |
| Tests | **Vitest** (unit), scripts against XRPL **Testnet** (end to end) | Rules engine is pure, so unit tests are cheap. |
| Hosting | Vercel (dashboard), Render or Fly.io (policy service), Neon (DB) | Free tiers cover a demo. Keep the service on a different host than the dashboard. |
| Logging | **pino** | Structured logs. Never log seeds or private keys. |

## Version and network facts to pin

- Network: XRPL **Testnet** (`wss://s.altnet.rippletest.net:51233`). Network id `xrpl:1`.
- Faucet funding: `client.fundWallet()` on Testnet.
- Confirm on Testnet before you rely on it: Payment Channels, escrow with conditions, multisig. These are long-standing features, but check each in your scripts early.
- MPT and RLUSD are out of scope for v1. XRP only. (See ADR-0005.)

## Things we deliberately do not use

- **Smart contracts or hooks.** Native features only.
- **A custody service.** Keys stay with their owners.
- **Browser storage for secrets.** The dashboard holds none.
