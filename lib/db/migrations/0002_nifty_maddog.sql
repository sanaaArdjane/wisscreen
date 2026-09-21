ALTER TABLE "invoices" ADD COLUMN "overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;