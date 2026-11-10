CREATE TYPE "public"."admin_role" AS ENUM('super', 'moderator', 'support');--> statement-breakpoint
CREATE TYPE "public"."banner_status" AS ENUM('live', 'scheduled', 'ended');--> statement-breakpoint
CREATE TYPE "public"."chip_tx_type" AS ENUM('welcome', 'daily_bonus', 'refill', 'entry', 'refund', 'win', 'admin_grant', 'admin_remove');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."ticket_kind" AS ENUM('ticket', 'report');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'solved');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'support' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"id" integer PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#0F4A2E' NOT NULL,
	"target" text DEFAULT 'lobby' NOT NULL,
	"status" "banner_status" DEFAULT 'live' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"taps" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chip_txs" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"type" "chip_tx_type" NOT NULL,
	"note" text,
	"admin_id" uuid,
	"table_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"chips" integer NOT NULL,
	"won" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_code" text NOT NULL,
	"mode" text NOT NULL,
	"players" integer NOT NULL,
	"entry" integer NOT NULL,
	"winner_name" text,
	"winner_player_id" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"end_reason" text NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"device_id" text,
	"phone" text,
	"device" text,
	"app_version" text,
	"push_token" text,
	"status" "player_status" DEFAULT 'active' NOT NULL,
	"chips" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"bonus_streak" integer DEFAULT 0 NOT NULL,
	"last_bonus_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_code_unique" UNIQUE("code"),
	CONSTRAINT "players_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "push_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"admin_id" uuid
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"from_admin_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "ticket_kind" DEFAULT 'ticket' NOT NULL,
	"player_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"tag" text DEFAULT 'GENERAL' NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"against_player_id" uuid,
	"table_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chip_txs" ADD CONSTRAINT "chip_txs_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chip_txs" ADD CONSTRAINT "chip_txs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_winner_player_id_players_id_fk" FOREIGN KEY ("winner_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_messages" ADD CONSTRAINT "push_messages_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_from_admin_id_admins_id_fk" FOREIGN KEY ("from_admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_against_player_id_players_id_fk" FOREIGN KEY ("against_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chip_txs_player_idx" ON "chip_txs" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "chip_txs_created_idx" ON "chip_txs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "game_players_player_idx" ON "game_players" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "games_ended_idx" ON "games" USING btree ("ended_at");