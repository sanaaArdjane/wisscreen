CREATE TABLE "demo_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"demo_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"granted_by_id" text,
	"note" text,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"last_access_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"demo_id" integer NOT NULL,
	"block_id" text NOT NULL,
	"label" text NOT NULL,
	"ciphertext" text NOT NULL,
	"reveal_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demos" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"category" text,
	"service_slug" text,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'brouillon' NOT NULL,
	"visibility" text DEFAULT 'assigned' NOT NULL,
	"expires_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "demos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_slug_plans_slug_fk";
--> statement-breakpoint
DROP INDEX "subscriptions_user_key";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan_slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "demo_id" integer;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "demo_run_id" integer;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD COLUMN "demo_id" integer;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD COLUMN "demo_access_id" integer;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD COLUMN "handled_by_id" text;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "pdf_key" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "entity" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "entity_id" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "category" text DEFAULT 'infrastructure' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "billing_period" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "specs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "pdf_key" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "request_messages" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "request_id" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "quote_id" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "price_cents" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency" text DEFAULT 'DZD' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_period" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "resource_spec" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "access_notes" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "renews_at" timestamp;--> statement-breakpoint
ALTER TABLE "demo_access" ADD CONSTRAINT "demo_access_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_access" ADD CONSTRAINT "demo_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_access" ADD CONSTRAINT "demo_access_granted_by_id_user_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_secrets" ADD CONSTRAINT "demo_secrets_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_secrets" ADD CONSTRAINT "demo_secrets_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demos" ADD CONSTRAINT "demos_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "demo_access_demo_user_key" ON "demo_access" USING btree ("demo_id","user_id");--> statement-breakpoint
CREATE INDEX "demo_access_user_idx" ON "demo_access" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_secrets_block_label_key" ON "demo_secrets" USING btree ("demo_id","block_id","label");--> statement-breakpoint
CREATE INDEX "demos_status_idx" ON "demos" USING btree ("status");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_demo_run_id_demo_runs_id_fk" FOREIGN KEY ("demo_run_id") REFERENCES "public"."demo_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD CONSTRAINT "demo_runs_demo_id_demos_id_fk" FOREIGN KEY ("demo_id") REFERENCES "public"."demos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD CONSTRAINT "demo_runs_demo_access_id_demo_access_id_fk" FOREIGN KEY ("demo_access_id") REFERENCES "public"."demo_access"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_runs" ADD CONSTRAINT "demo_runs_handled_by_id_user_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_slug_plans_slug_fk" FOREIGN KEY ("plan_slug") REFERENCES "public"."plans"("slug") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_demo_idx" ON "attachments" USING btree ("demo_id");--> statement-breakpoint
CREATE INDEX "attachments_demo_run_idx" ON "attachments" USING btree ("demo_run_id");--> statement-breakpoint
CREATE INDEX "demo_runs_demo_idx" ON "demo_runs" USING btree ("demo_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
-- ─────────────────────────────────────────────────────────────────────────────
-- Hand-added. Drizzle emits DDL only, and these three are the data half of the
-- same change; without them the schema is right and the rows still describe the
-- old model.
--
-- 1. Platform usage stops being metered. `requests.monthly` and `demo.runs`
--    counted how much of the *dashboard* an account had used, which is not
--    something WICLOUD sells. Quotas now meter consumables (SMTP, AI, SMS), and
--    a metric with no row is unlimited — so deleting these rows IS the removal.
--    Historic `demo_runs` rows with outcome 'quota' are deliberately kept: they
--    are what happened, and /admin/demos labels them as the old system.
DELETE FROM "quotas" WHERE "metric" IN ('requests.monthly', 'demo.runs');
--> statement-breakpoint
-- 2. A subscription now owns its own price, so that re-pricing the catalogue
--    cannot silently re-price a live service. Existing rows were priced by
--    reference; copy the value across once so none of them reads as free.
UPDATE "subscriptions" s
   SET "price_cents" = p."price_cents",
       "currency" = p."currency",
       "label" = p."name"
  FROM "plans" p
 WHERE p."slug" = s."plan_slug" AND s."price_cents" IS NULL;
--> statement-breakpoint
-- 3. Existing subscriptions predate the `pending → active` lifecycle and are
--    live by definition. The column default changed under them; this makes the
--    rows say what was already true.
UPDATE "subscriptions" SET "status" = 'active' WHERE "status" = 'pending';
