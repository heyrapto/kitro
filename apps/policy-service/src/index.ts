import { serve } from "@hono/node-server";
import pino from "pino";
import { createDb } from "@kitro/db";
import { createPolicyApp } from "./app";
import { DbPolicyStore } from "./db-store";
import { MemoryPolicyStore, type PolicyStore } from "./store";

const logger = pino({ name: "kitro-policy-service" });

const dbUrl = process.env.DATABASE_URL;
let store: PolicyStore = new MemoryPolicyStore();

if (dbUrl) {
  try {
    const db = createDb(dbUrl);
    store = new DbPolicyStore(db);
    logger.info("Using PostgreSQL DbPolicyStore for durable state persistence");
  } catch (err: any) {
    logger.warn(
      { err: err.message },
      "Could not initialize PostgreSQL store; falling back to in-memory store",
    );
  }
} else {
  logger.info("DATABASE_URL not set; using in-memory store");
}

const app = createPolicyApp(store);
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  logger.info({ port: info.port }, "policy service listening");
});
