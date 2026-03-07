-- Bean share feature: user_beans table, beans_share table, beans table changes.
-- Idempotent: safe to run multiple times.

-- 1. Create user_beans table (per-user bean data: open_bag_date)
CREATE TABLE IF NOT EXISTS "user_beans" (
  "bean_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "open_bag_date" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("bean_id", "user_id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_beans_bean_id_beans_id_fk'
  ) THEN
    ALTER TABLE "user_beans" ADD CONSTRAINT "user_beans_bean_id_beans_id_fk"
      FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_beans_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "user_beans" ADD CONSTRAINT "user_beans_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Add new columns to beans (before renaming/dropping)
ALTER TABLE "beans" ADD COLUMN IF NOT EXISTS "general_access" text DEFAULT 'restricted' NOT NULL;
ALTER TABLE "beans" ADD COLUMN IF NOT EXISTS "general_access_share_shots" boolean DEFAULT false NOT NULL;
ALTER TABLE "beans" ADD COLUMN IF NOT EXISTS "share_slug" text;

-- 3. Migrate existing beans data into user_beans (only if beans still has user_id and open_bag_date)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'open_bag_date'
  ) THEN
    INSERT INTO "user_beans" ("bean_id", "user_id", "open_bag_date", "created_at")
    SELECT "id", "user_id", "open_bag_date", "created_at" FROM "beans"
    ON CONFLICT ("bean_id", "user_id") DO NOTHING;
  END IF;
END $$;

-- 4. Rename user_id → created_by on beans
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "beans" RENAME COLUMN "user_id" TO "created_by";
  END IF;
END $$;

-- 5. Drop open_bag_date from beans
ALTER TABLE "beans" DROP COLUMN IF EXISTS "open_bag_date";

-- 6. Create beans_share table
CREATE TABLE IF NOT EXISTS "beans_share" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bean_id" uuid NOT NULL,
  "sharer_user_id" uuid NOT NULL,
  "receiver_user_id" uuid NOT NULL,
  "share_shot_history" boolean DEFAULT false NOT NULL,
  "reshare_enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_bean_id_beans_id_fk'
  ) THEN
    ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_bean_id_beans_id_fk"
      FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_sharer_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_sharer_user_id_users_id_fk"
      FOREIGN KEY ("sharer_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_receiver_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_receiver_user_id_users_id_fk"
      FOREIGN KEY ("receiver_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_bean_sharer_receiver_key'
  ) THEN
    ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_bean_sharer_receiver_key"
      UNIQUE ("bean_id", "sharer_user_id", "receiver_user_id");
  END IF;
END $$;
