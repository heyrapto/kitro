import { serve } from "@hono/node-server";
import { Hono } from "hono";
import pino from "pino";

const logger = pino({ name: "kitro-policy-service" });

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true, service: "kitro-policy-service" }));

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, "policy service listening");
});
