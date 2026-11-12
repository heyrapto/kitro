# 0000: Stack choices

**Context.** A short build, a live demo, and one hard requirement: the agent must not control the limits.

**Decision.** TypeScript across the repo. Next.js (App Router) for the operator dashboard. Hono for the policy service, as a separate process. Postgres with Drizzle. xrpl.js. Vercel AI SDK with the Anthropic provider for the agent. pnpm and Turborepo. Vitest.

**Consequences.**
- One language and shared zod types reduce mismatches.
- The policy service is **not** a Next.js route. Putting it in the same app the agent can reach would weaken the independence we are selling.
- Postgres is heavier than SQLite but gives row locks for the daily-cap race.
