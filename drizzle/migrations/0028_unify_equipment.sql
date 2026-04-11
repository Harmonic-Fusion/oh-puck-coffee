-- Unify grinders/machines/tools into a single `equipment` table.
-- Idempotent: safe to re-run against a database where any/all changes already exist.

-- 1. Create unified equipment table
CREATE TABLE IF NOT EXISTS "equipment" (
  "id"          text PRIMARY KEY NOT NULL,
  "type"        text NOT NULL,
  "name"        text NOT NULL,
  "slug"        text,
  "description" text,
  "created_by"  text,
  "is_global"   boolean NOT NULL DEFAULT true,
  "image_id"    text,
  "created_at"  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "equipment_type_name_key" UNIQUE ("type", "name")
);

-- 2. Copy grinder data
INSERT INTO "equipment" ("id", "type", "name", "slug", "description", "created_by", "is_global", "image_id", "created_at")
  SELECT "id", 'grinder', "name", NULL, NULL, "created_by", "is_global", "image_id", "created_at"
  FROM "grinders"
  ON CONFLICT DO NOTHING;

-- 3. Copy machine data
INSERT INTO "equipment" ("id", "type", "name", "slug", "description", "created_by", "is_global", "image_id", "created_at")
  SELECT "id", 'machine', "name", NULL, NULL, "created_by", "is_global", "image_id", "created_at"
  FROM "machines"
  ON CONFLICT DO NOTHING;

-- 4. Copy tool data (cast uuid to text)
INSERT INTO "equipment" ("id", "type", "name", "slug", "description", "created_by", "is_global", "image_id", "created_at")
  SELECT "id"::text, 'tool', "name", "slug", "description", "created_by", "is_global", NULL, "created_at"
  FROM "tools"
  ON CONFLICT DO NOTHING;

-- 5. Create unified user_equipment junction table
CREATE TABLE IF NOT EXISTS "user_equipment" (
  "user_id"      text NOT NULL,
  "equipment_id" text NOT NULL,
  "created_at"   timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "user_equipment_pk" PRIMARY KEY ("user_id", "equipment_id")
);

-- 6. Copy junction data from all three legacy tables
INSERT INTO "user_equipment" ("user_id", "equipment_id", "created_at")
  SELECT "user_id", "grinder_id", "created_at"
  FROM "equipment_users_grinders"
  ON CONFLICT DO NOTHING;

INSERT INTO "user_equipment" ("user_id", "equipment_id", "created_at")
  SELECT "user_id", "machine_id", "created_at"
  FROM "equipment_users_machines"
  ON CONFLICT DO NOTHING;

INSERT INTO "user_equipment" ("user_id", "equipment_id", "created_at")
  SELECT "user_id", "tool_id"::text, "created_at"
  FROM "equipment_users_tools"
  ON CONFLICT DO NOTHING;

-- 7. Partial unique index on slug (tools only)
CREATE UNIQUE INDEX IF NOT EXISTS "equipment_slug_unique" ON "equipment" ("slug") WHERE "slug" IS NOT NULL;

-- 8. FK constraints on equipment table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_created_by_users_id_fk') THEN
    ALTER TABLE "equipment" ADD CONSTRAINT "equipment_created_by_users_id_fk"
      FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_image_id_images_id_fk') THEN
    ALTER TABLE "equipment" ADD CONSTRAINT "equipment_image_id_images_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

-- 9. FK constraints on user_equipment table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_equipment_user_id_users_id_fk') THEN
    ALTER TABLE "user_equipment" ADD CONSTRAINT "user_equipment_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_equipment_equipment_id_equipment_id_fk') THEN
    ALTER TABLE "user_equipment" ADD CONSTRAINT "user_equipment_equipment_id_equipment_id_fk"
      FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- 10. Re-point shots FKs from grinders/machines to equipment
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_grinder_id_grinders_id_fk') THEN
    ALTER TABLE "shots" DROP CONSTRAINT "shots_grinder_id_grinders_id_fk";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_grinder_id_equipment_id_fk') THEN
    ALTER TABLE "shots" ADD CONSTRAINT "shots_grinder_id_equipment_id_fk"
      FOREIGN KEY ("grinder_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_machine_id_machines_id_fk') THEN
    ALTER TABLE "shots" DROP CONSTRAINT "shots_machine_id_machines_id_fk";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_machine_id_equipment_id_fk') THEN
    ALTER TABLE "shots" ADD CONSTRAINT "shots_machine_id_equipment_id_fk"
      FOREIGN KEY ("machine_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
