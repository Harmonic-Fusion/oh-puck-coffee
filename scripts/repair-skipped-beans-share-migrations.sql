-- Last-resort repair when migrations cannot run (empty beans / beans_share / user_beans).
-- Prefer: `pnpm db:migrate` — 0027_beans_share_legacy_to_user_invited migrates legacy
-- sharer_user_id/receiver_user_id to user_id/invited_by in place.
-- Run: set -a && . ./.env && set +a && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/repair-skipped-beans-share-migrations.sql

BEGIN;

DROP TABLE IF EXISTS "user_beans" CASCADE;
DROP TABLE IF EXISTS "beans_share" CASCADE;

ALTER TABLE "beans" DROP COLUMN IF EXISTS "origin";
ALTER TABLE "beans" DROP COLUMN IF EXISTS "roaster";
ALTER TABLE "beans" DROP COLUMN IF EXISTS "created_by";
ALTER TABLE "beans" DROP COLUMN IF EXISTS "general_access_share_shots";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE "beans" ADD COLUMN "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "beans" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
    UPDATE "beans" SET "updated_at" = "created_at";
  END IF;
END $$;

CREATE TABLE "beans_share" (
  "id" text PRIMARY KEY NOT NULL,
  "bean_id" text NOT NULL,
  "user_id" text NOT NULL,
  "invited_by" text,
  "status" text NOT NULL,
  "shot_history_access" text DEFAULT 'restricted' NOT NULL,
  "reshare_allowed" boolean DEFAULT false NOT NULL,
  "beans_open_date" timestamp,
  "chat_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "beans_share_bean_user_key" UNIQUE ("bean_id", "user_id")
);

ALTER TABLE "beans_share"
  ADD CONSTRAINT "beans_share_bean_id_beans_id_fk"
  FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE CASCADE;

ALTER TABLE "beans_share"
  ADD CONSTRAINT "beans_share_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "beans_share"
  ADD CONSTRAINT "beans_share_invited_by_users_id_fk"
  FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "beans_share"
  ADD CONSTRAINT "beans_share_chat_id_chats_id_fk"
  FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE SET NULL;

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'e97674ba34f7155fcfe474a47a7af2dcba37e4c6e5d34bfdd7bd27001c31331d', (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = 'e97674ba34f7155fcfe474a47a7af2dcba37e4c6e5d34bfdd7bd27001c31331d');

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'b7decdf2409891ce818de24242e3328833b15843a2a537b41052635fa1be8f0b', (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = 'b7decdf2409891ce818de24242e3328833b15843a2a537b41052635fa1be8f0b');

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '0b9aa2443a8ff81ebd1c46a91d1d403e1b0cc6c64b9915bbc9636af399f6a130', (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = '0b9aa2443a8ff81ebd1c46a91d1d403e1b0cc6c64b9915bbc9636af399f6a130');

COMMIT;
