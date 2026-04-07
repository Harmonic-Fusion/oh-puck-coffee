-- Historical migration: previously DROP/CREATE beans_share for the uuid-era model.
-- Legacy databases (sharer_user_id / receiver_user_id) are migrated by
-- 0027_beans_share_legacy_to_user_invited.sql. This file is retained so migration
-- hashes stay stable; it is a no-op at apply time.

DO $$
BEGIN
  NULL;
END $$;
