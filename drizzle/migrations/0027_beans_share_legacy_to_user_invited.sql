-- Migrate legacy beans_share (sharer_user_id + receiver_user_id) to user_id + invited_by.
-- Idempotent: no-op when user_id already exists, or when legacy columns are already gone.

DO $$
DECLARE
  has_share_shot_history boolean;
  has_reshare_enabled boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'beans_share'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'receiver_user_id'
  ) THEN
    RAISE NOTICE '0027_beans_share_legacy_to_user_invited: no legacy columns; skipping';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'share_shot_history'
  ) INTO has_share_shot_history;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'reshare_enabled'
  ) INTO has_reshare_enabled;

  ALTER TABLE "beans_share" DROP CONSTRAINT IF EXISTS "beans_share_bean_sharer_receiver_key";
  ALTER TABLE "beans_share" DROP CONSTRAINT IF EXISTS "beans_share_sharer_user_id_users_id_fk";
  ALTER TABLE "beans_share" DROP CONSTRAINT IF EXISTS "beans_share_receiver_user_id_users_id_fk";

  ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "user_id" text;
  ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "invited_by" text;
  ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "shot_history_access" text DEFAULT 'restricted';
  ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "reshare_allowed" boolean DEFAULT false NOT NULL;
  ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "beans_open_date" timestamp;
  ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

  UPDATE "beans_share" SET
    "user_id" = "receiver_user_id"::text,
    "invited_by" = "sharer_user_id"::text,
    "updated_at" = COALESCE("updated_at", "created_at", now())
  WHERE "user_id" IS NULL;

  IF has_share_shot_history THEN
    UPDATE "beans_share" SET "shot_history_access" = CASE
      WHEN "share_shot_history" THEN 'anyone_with_link' ELSE 'restricted' END;
  ELSE
    UPDATE "beans_share" SET "shot_history_access" = COALESCE("shot_history_access", 'restricted');
  END IF;

  IF has_reshare_enabled THEN
    UPDATE "beans_share" SET "reshare_allowed" = COALESCE("reshare_enabled", false);
  END IF;

  ALTER TABLE "beans_share" ALTER COLUMN "shot_history_access" SET DEFAULT 'restricted';
  ALTER TABLE "beans_share" ALTER COLUMN "shot_history_access" SET NOT NULL;

  ALTER TABLE "beans_share" ALTER COLUMN "user_id" SET NOT NULL;

  ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "sharer_user_id";
  ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "receiver_user_id";
  ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "share_shot_history";
  ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "reshare_enabled";

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_bean_user_key') THEN
    ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_bean_user_key" UNIQUE ("bean_id", "user_id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_user_id_users_id_fk') THEN
    ALTER TABLE "beans_share"
      ADD CONSTRAINT "beans_share_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_invited_by_users_id_fk') THEN
    ALTER TABLE "beans_share"
      ADD CONSTRAINT "beans_share_invited_by_users_id_fk"
      FOREIGN KEY ("invited_by") REFERENCES "users" ("id") ON DELETE SET NULL;
  END IF;
END $$;
