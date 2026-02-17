-- Phase 3: Data & Schema Changes
-- 1. Create origins and roasters global tables
-- 2. Add new columns to beans (originId, roasterId, originDetails, openBagDate)
-- 3. Rename beans.created_by → beans.user_id
-- 4. Add estimateMaxPressure and flowControl to shots
-- 5. Auto-migrate existing roaster text values into roasters table and backfill roasterId

-- ============ New tables ============

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

-- ============ Beans: new columns ============
--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "origin_id" integer;
--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "roaster_id" integer;
--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "origin_details" text;
--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "open_bag_date" timestamp;

-- ============ Beans: rename created_by → user_id ============
--> statement-breakpoint
ALTER TABLE "beans" RENAME COLUMN "created_by" TO "user_id";

-- Drop old FK constraint and create new one with the renamed column
--> statement-breakpoint
ALTER TABLE "beans" DROP CONSTRAINT IF EXISTS "beans_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- ============ Beans: add FKs for origin and roaster ============
--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_origin_id_origins_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."origins"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_roaster_id_roasters_id_fk" FOREIGN KEY ("roaster_id") REFERENCES "public"."roasters"("id") ON DELETE no action ON UPDATE no action;

-- ============ Shots: new columns ============
--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "estimate_max_pressure" numeric(4, 1);
--> statement-breakpoint
ALTER TABLE "shots" ADD COLUMN "flow_control" numeric(4, 1);

-- ============ Auto-migrate: backfill roasters from existing beans.roaster text ============
--> statement-breakpoint
INSERT INTO "roasters" ("name")
SELECT DISTINCT "roaster" FROM "beans"
WHERE "roaster" IS NOT NULL AND "roaster" != ''
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
UPDATE "beans"
SET "roaster_id" = "roasters"."id"
FROM "roasters"
WHERE "beans"."roaster" = "roasters"."name";
