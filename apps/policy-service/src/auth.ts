import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";

function tokensMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

/**
 * Agent routes require a shared bearer token. Operator routes use the wallet
 * session flow instead and must not use this middleware.
 *
 * Fails closed: if AGENT_API_TOKEN is missing, every request is rejected.
 */
export function agentAuth(token = process.env.AGENT_API_TOKEN): MiddlewareHandler {
  return async (c, next) => {
    if (!token) {
      return c.json({ error: "agent auth is not configured" }, 500);
    }

    const match = /^Bearer\s+(.+)$/i.exec(c.req.header("Authorization") ?? "");
    const provided = match?.[1];

    if (!provided || !tokensMatch(provided, token)) {
      return c.json({ error: "unauthorized" }, 401);
    }

    await next();
  };
}
