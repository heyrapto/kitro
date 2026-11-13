import { randomBytes } from "node:crypto";
import { deriveAddress, verify } from "ripple-keypairs";
import type { MiddlewareHandler } from "hono";

type Challenge = {
  address: string;
  expiresAt: number;
};

type Session = {
  address: string;
  expiresAt: number;
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 15 * 60 * 1000;

export class OperatorAuth {
  private readonly challenges = new Map<string, Challenge>();
  private readonly sessions = new Map<string, Session>();

  createChallenge(address: string, now = Date.now()): { nonce: string; expiresAt: number } {
    const nonce = randomBytes(32).toString("hex").toUpperCase();
    const expiresAt = now + CHALLENGE_TTL_MS;
    this.challenges.set(nonce, { address, expiresAt });
    return { nonce, expiresAt };
  }

  verifyChallenge(
    address: string,
    nonce: string,
    publicKey: string,
    signature: string,
    now = Date.now(),
  ): string | null {
    const challenge = this.challenges.get(nonce);
    this.challenges.delete(nonce);
    if (!challenge || challenge.address !== address || challenge.expiresAt <= now) return null;

    try {
      if (deriveAddress(publicKey) !== address || !verify(nonce, signature, publicKey)) return null;
    } catch {
      return null;
    }

    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, { address, expiresAt: now + SESSION_TTL_MS });
    return token;
  }

  addressForToken(token: string | undefined, now = Date.now()): string | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= now) {
      this.sessions.delete(token);
      return null;
    }
    return session.address;
  }

  middleware(expectedAddress: () => string | null | Promise<string | null>): MiddlewareHandler {
    return async (c, next) => {
      const match = /^Bearer\s+(.+)$/i.exec(c.req.header("Authorization") ?? "");
      const address = this.addressForToken(match?.[1]);
      const expected = await expectedAddress();
      if (!address || !expected || address !== expected) {
        return c.json({ error: "unauthorized" }, 401);
      }
      c.set("operatorAddress", address);
      await next();
    };
  }
}
