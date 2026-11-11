ALTER TABLE "players" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "photo" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "photo_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "profile_done" boolean DEFAULT false NOT NULL;