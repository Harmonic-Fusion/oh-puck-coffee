-- User equipment collections + ownership / image columns on grinders & machines.
-- Idempotent: safe if tables/columns/constraints already exist.

CREATE TABLE IF NOT EXISTS "equipment_users_grinders" (
  "user_id" text NOT NULL,
  "grinder_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "equipment_users_grinders_user_id_grinder_id_pk" PRIMARY KEY ("user_id", "grinder_id")
);

CREATE TABLE IF NOT EXISTS "equipment_users_machines" (
  "user_id" text NOT NULL,
  "machine_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "equipment_users_machines_user_id_machine_id_pk" PRIMARY KEY ("user_id", "machine_id")
);

CREATE TABLE IF NOT EXISTS "equipment_users_tools" (
  "user_id" text NOT NULL,
  "tool_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "equipment_users_tools_user_id_tool_id_pk" PRIMARY KEY ("user_id", "tool_id")
);

ALTER TABLE "grinders" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "grinders" ADD COLUMN IF NOT EXISTS "is_global" boolean DEFAULT true NOT NULL;
ALTER TABLE "grinders" ADD COLUMN IF NOT EXISTS "image_id" text;

ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "is_global" boolean DEFAULT true NOT NULL;
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "image_id" text;

ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "is_global" boolean DEFAULT true NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_users_grinders_user_id_users_id_fk') THEN
    ALTER TABLE "equipment_users_grinders" ADD CONSTRAINT "equipment_users_grinders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_users_grinders_grinder_id_grinders_id_fk') THEN
    ALTER TABLE "equipment_users_grinders" ADD CONSTRAINT "equipment_users_grinders_grinder_id_grinders_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."grinders"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_users_machines_user_id_users_id_fk') THEN
    ALTER TABLE "equipment_users_machines" ADD CONSTRAINT "equipment_users_machines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_users_machines_machine_id_machines_id_fk') THEN
    ALTER TABLE "equipment_users_machines" ADD CONSTRAINT "equipment_users_machines_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_users_tools_user_id_users_id_fk') THEN
    ALTER TABLE "equipment_users_tools" ADD CONSTRAINT "equipment_users_tools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_users_tools_tool_id_tools_id_fk') THEN
    ALTER TABLE "equipment_users_tools" ADD CONSTRAINT "equipment_users_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grinders_created_by_users_id_fk') THEN
    ALTER TABLE "grinders" ADD CONSTRAINT "grinders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grinders_image_id_images_id_fk') THEN
    ALTER TABLE "grinders" ADD CONSTRAINT "grinders_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machines_created_by_users_id_fk') THEN
    ALTER TABLE "machines" ADD CONSTRAINT "machines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'machines_image_id_images_id_fk') THEN
    ALTER TABLE "machines" ADD CONSTRAINT "machines_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tools_created_by_users_id_fk') THEN
    ALTER TABLE "tools" ADD CONSTRAINT "tools_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

-- Backfill: add all global catalog equipment to each user’s collection (idempotent).
INSERT INTO "equipment_users_grinders" ("user_id", "grinder_id", "created_at")
SELECT u."id", g."id", now()
FROM "users" u
INNER JOIN "grinders" g ON g."is_global" = true
ON CONFLICT ("user_id", "grinder_id") DO NOTHING;

INSERT INTO "equipment_users_machines" ("user_id", "machine_id", "created_at")
SELECT u."id", m."id", now()
FROM "users" u
INNER JOIN "machines" m ON m."is_global" = true
ON CONFLICT ("user_id", "machine_id") DO NOTHING;

INSERT INTO "equipment_users_tools" ("user_id", "tool_id", "created_at")
SELECT u."id", t."id", now()
FROM "users" u
INNER JOIN "tools" t ON t."is_global" = true
ON CONFLICT ("user_id", "tool_id") DO NOTHING;

-- New users: copy global catalog into their collection automatically.
CREATE OR REPLACE FUNCTION "equipment_backfill_user_collection"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "equipment_users_grinders" ("user_id", "grinder_id", "created_at")
  SELECT NEW."id", g."id", now()
  FROM "grinders" g
  WHERE g."is_global" = true
  ON CONFLICT ("user_id", "grinder_id") DO NOTHING;

  INSERT INTO "equipment_users_machines" ("user_id", "machine_id", "created_at")
  SELECT NEW."id", m."id", now()
  FROM "machines" m
  WHERE m."is_global" = true
  ON CONFLICT ("user_id", "machine_id") DO NOTHING;

  INSERT INTO "equipment_users_tools" ("user_id", "tool_id", "created_at")
  SELECT NEW."id", t."id", now()
  FROM "tools" t
  WHERE t."is_global" = true
  ON CONFLICT ("user_id", "tool_id") DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "equipment_backfill_user_collection_trigger" ON "users";
CREATE TRIGGER "equipment_backfill_user_collection_trigger"
  AFTER INSERT ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION "equipment_backfill_user_collection"();
