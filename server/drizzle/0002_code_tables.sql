CREATE TYPE "public"."code_table_status" AS ENUM('open', 'playing', 'finished', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "code_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text,
	"mode" text NOT NULL,
	"players" integer NOT NULL,
	"entry" integer DEFAULT 0 NOT NULL,
	"allow" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_start" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "code_table_status" DEFAULT 'open' NOT NULL,
	"table_code" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"report" jsonb,
	CONSTRAINT "code_tables_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "code_tables" ADD CONSTRAINT "code_tables_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_tables_status_idx" ON "code_tables" USING btree ("status");