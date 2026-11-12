import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const drops = (name: string) => numeric(name, { precision: 20, scale: 0 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const mandates = pgTable("mandates", {
  version: integer("version").primaryKey(),
  body: jsonb("body").notNull(),
  signature: text("signature").notNull(),
  publicKey: text("public_key").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: text("invoice_id").notNull(),
    payee: text("payee").notNull(),
    amountDrops: drops("amount_drops").notNull(),
    status: text("status").notNull(),
    route: text("route"),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("requests_payee_invoice_idx").on(table.payee, table.invoiceId)],
);

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    outcome: text("outcome").notNull(),
    reasons: jsonb("reasons").notNull().$type<string[]>(),
    mandateVersion: integer("mandate_version")
      .notNull()
      .references(() => mandates.version),
    receipt: jsonb("receipt").notNull(),
    receiptHash: text("receipt_hash").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("decisions_request_idx").on(table.requestId)],
);

export const spend = pgTable("spend", {
  day: date("day").primaryKey(),
  reservedDrops: drops("reserved_drops").notNull().default("0"),
  confirmedDrops: drops("confirmed_drops").notNull().default("0"),
});

export const channels = pgTable("channels", {
  channelId: text("channel_id").primaryKey(),
  payee: text("payee").notNull(),
  amountDrops: drops("amount_drops").notNull(),
  claimedTotalDrops: drops("claimed_total_drops").notNull().default("0"),
  settleDelay: integer("settle_delay").notNull(),
  status: text("status").notNull(),
  createdAt: createdAt(),
});

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.channelId, { onDelete: "cascade" }),
    cumulativeDrops: drops("cumulative_drops").notNull(),
    signature: text("signature").notNull(),
    requestId: uuid("request_id").references(() => requests.id),
    createdAt: createdAt(),
  },
  (table) => [index("claims_channel_idx").on(table.channelId)],
);

export const escrows = pgTable("escrows", {
  ownerSequence: integer("owner_sequence").primaryKey(),
  payee: text("payee").notNull(),
  amountDrops: drops("amount_drops").notNull(),
  condition: text("condition").notNull(),
  fulfillmentEnc: text("fulfillment_enc").notNull(),
  cancelAfter: integer("cancel_after").notNull(),
  status: text("status").notNull(),
  createdAt: createdAt(),
});

export const approvals = pgTable("approvals", {
  requestId: uuid("request_id")
    .primaryKey()
    .references(() => requests.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const txs = pgTable(
  "txs",
  {
    hash: text("hash").primaryKey(),
    requestId: uuid("request_id").references(() => requests.id),
    type: text("type").notNull(),
    result: text("result").notNull(),
    validated: boolean("validated").notNull().default(false),
    ledgerIndex: integer("ledger_index"),
    createdAt: createdAt(),
  },
  (table) => [index("txs_request_idx").on(table.requestId)],
);
