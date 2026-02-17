CREATE TABLE "origins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "origins_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roasters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roasters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shot_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"shot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beans" RENAME COLUMN "created_by" TO "user_id";--> statement-breakpoint
ALTER TABLE "beans" DROP CONSTRAINT "beans_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "origin_id" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "roaster_id" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "origin_details" text;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "open_bag_date" timestamp;--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "estimate_max_pressure" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "flow_control" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_custom_name" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shot_shares" ADD CONSTRAINT "shot_shares_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_shares" ADD CONSTRAINT "shot_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_origin_id_origins_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."origins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_roaster_id_roasters_id_fk" FOREIGN KEY ("roaster_id") REFERENCES "public"."roasters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;