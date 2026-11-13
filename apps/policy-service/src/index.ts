import { serve } from "@hono/node-server";
import pino from "pino";
import { createPolicyApp } from "./app";

const logger = pino({ name: "kitro-policy-service" });
const app = createPolicyApp();

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, "policy service listening");
});
