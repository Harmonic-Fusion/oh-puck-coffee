-- Remove unshared_at from beans_share.
-- Sharing is now one-way; owner remove = hard delete of share row. No soft unshare.

ALTER TABLE "beans_share" DROP COLUMN IF EXISTS "unshared_at";
