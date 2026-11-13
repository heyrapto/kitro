CREATE TABLE "approvals" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"payee" text NOT NULL,
	"amount_drops" numeric(20, 0) NOT NULL,
	"claimed_total_drops" numeric(20, 0) DEFAULT '0' NOT NULL,
	"settle_delay" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"cumulative_drops" numeric(20, 0) NOT NULL,
	"signature" text NOT NULL,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"reasons" jsonb NOT NULL,
	"mandate_version" integer NOT NULL,
	"receipt" jsonb NOT NULL,
	"receipt_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrows" (
	"owner_sequence" integer PRIMARY KEY NOT NULL,
	"payee" text NOT NULL,
	"amount_drops" numeric(20, 0) NOT NULL,
	"condition" text NOT NULL,
	"fulfillment_enc" text NOT NULL,
	"cancel_after" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mandates" (
	"version" integer PRIMARY KEY NOT NULL,
	"body" jsonb NOT NULL,
	"signature" text NOT NULL,
	"public_key" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" text NOT NULL,
	"payee" text NOT NULL,
	"amount_drops" numeric(20, 0) NOT NULL,
	"status" text NOT NULL,
	"route" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spend" (
	"day" date PRIMARY KEY NOT NULL,
	"reserved_drops" numeric(20, 0) DEFAULT '0' NOT NULL,
	"confirmed_drops" numeric(20, 0) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "txs" (
	"hash" text PRIMARY KEY NOT NULL,
	"request_id" uuid,
	"type" text NOT NULL,
	"result" text NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"ledger_index" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_channel_id_channels_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_mandate_version_mandates_version_fk" FOREIGN KEY ("mandate_version") REFERENCES "public"."mandates"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "txs" ADD CONSTRAINT "txs_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_channel_idx" ON "claims" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "decisions_request_idx" ON "decisions" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "requests_payee_invoice_idx" ON "requests" USING btree ("payee","invoice_id");--> statement-breakpoint
CREATE INDEX "txs_request_idx" ON "txs" USING btree ("request_id");