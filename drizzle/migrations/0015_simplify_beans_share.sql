-- Simplify beans_share: replace sharer_user_id/receiver_user_id with user_id + invited_by.
-- The owner is now a regular row with invited_by = NULL.
-- Also removes share_my_shots_publicly from user_beans (superseded by beans_share.share_shot_history).
-- Tables are empty so no data migration is needed.

-- 1. Drop the old beans_share table and recreate with the new schema.
DROP TABLE IF EXISTS "beans_share";

CREATE TABLE "beans_share" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bean_id"             uuid NOT NULL,
  "user_id"             uuid NOT NULL,
  "invited_by"          uuid,
  "status"              text DEFAULT 'pending' NOT NULL,
  "share_shot_history"  boolean DEFAULT false NOT NULL,
  "reshare_enabled"     boolean DEFAULT false NOT NULL,
  "created_at"          timestamp DEFAULT now() NOT NULL,
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

-- 2. Drop share_my_shots_publicly from user_beans (superseded by beans_share.share_shot_history).
ALTER TABLE "user_beans" DROP COLUMN IF EXISTS "share_my_shots_publicly";
