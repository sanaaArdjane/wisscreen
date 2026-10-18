CREATE TABLE "site_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"content" jsonb NOT NULL,
	"author_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_id" text
);
--> statement-breakpoint
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "site_posts_slug_idx" ON "site_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "site_posts_published_idx" ON "site_posts" USING btree ("published","published_at");