-- Restore share_my_shots_publicly on user_beans (was dropped in 0015; still required for share-the-beans feature).
-- Idempotent: safe to run multiple times.

ALTER TABLE "user_beans" ADD COLUMN IF NOT EXISTS "share_my_shots_publicly" boolean DEFAULT false NOT NULL;
