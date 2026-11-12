import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { agentAuth } from "./auth";

const TOKEN = "agent-token-123";

function makeApp(token: string | null = TOKEN) {
  const app = new Hono();
  app.use("/agent/*", agentAuth(token ?? undefined));
  app.get("/agent/ping", (c) => c.json({ ok: true }));
  app.get("/health", (c) => c.json({ ok: true }));
  return app;
}

describe("agentAuth", () => {
  it("accepts a valid bearer token", async () => {
    const response = await makeApp().request("/agent/ping", {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("accepts a case-insensitive bearer scheme", async () => {
    const response = await makeApp().request("/agent/ping", {
      headers: { Authorization: `bearer ${TOKEN}` },
    });

    expect(response.status).toBe(200);
  });

  it("rejects a missing, malformed or wrong token", async () => {
    const app = makeApp();

    for (const headers of [
      {},
      { Authorization: "Bearer wrong-token" },
      { Authorization: TOKEN },
      { Authorization: `Basic ${TOKEN}` },
      { Authorization: "Bearer " },
    ]) {
      const response = await app.request("/agent/ping", { headers });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
    }
  });

  it("does not protect routes outside its scope", async () => {
    const response = await makeApp().request("/health");

    expect(response.status).toBe(200);
  });

  it("fails closed when the token is not configured", async () => {
    const response = await makeApp(null).request("/agent/ping", {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "agent auth is not configured" });
  });
});
