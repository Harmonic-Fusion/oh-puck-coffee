-- Add shot_shares table for public share links with obfuscated short UIDs

CREATE TABLE "shot_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"shot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shot_shares" ADD CONSTRAINT "shot_shares_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shot_shares" ADD CONSTRAINT "shot_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
