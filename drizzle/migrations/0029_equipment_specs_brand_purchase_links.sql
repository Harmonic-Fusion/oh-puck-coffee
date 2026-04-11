-- Add brand, specs, admin_approved to unified equipment; create equipment_purchase_link.
-- Idempotent: safe to re-run.

-- 1. New columns on equipment
ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "admin_approved" boolean NOT NULL DEFAULT false;
ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "brand" text;
ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "specs" jsonb;

-- 2. Backfill: catalog / global rows are treated as admin-approved (seeded catalog)
UPDATE "equipment"
SET "admin_approved" = true
WHERE "is_global" = true;

-- 3. Purchase links table
CREATE TABLE IF NOT EXISTS "equipment_purchase_link" (
  "id" text PRIMARY KEY NOT NULL,
  "equipment_id" text NOT NULL,
  "marketplace" text NOT NULL,
  "affiliate_program" text,
  "base_url" text NOT NULL,
  "affiliate_tag" text,
  "price_usd" numeric(10, 2),
  "region" text NOT NULL DEFAULT 'US',
  "is_canonical" boolean NOT NULL DEFAULT false,
  "approved_by_user_id" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "last_verified_at" timestamp,
  "deactivated_at" timestamp
);

CREATE INDEX IF NOT EXISTS "equipment_purchase_link_equipment_id_idx"
  ON "equipment_purchase_link" ("equipment_id");

-- 4. FK: equipment_id → equipment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_purchase_link_equipment_id_equipment_id_fk') THEN
    ALTER TABLE "equipment_purchase_link" ADD CONSTRAINT "equipment_purchase_link_equipment_id_equipment_id_fk"
      FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- 5. FK: approved_by_user_id → users (nullable)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_purchase_link_approved_by_user_id_users_id_fk') THEN
    ALTER TABLE "equipment_purchase_link" ADD CONSTRAINT "equipment_purchase_link_approved_by_user_id_users_id_fk"
      FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
