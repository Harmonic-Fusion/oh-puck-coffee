-- Add status to beans_share: pending (default) vs accepted. Receiver must accept before gaining access.
-- Idempotent: safe to run multiple times.
-- Existing rows get default 'accepted'; then we set default to 'pending' for new shares.

ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'accepted' NOT NULL;

-- New shares default to pending (receiver must accept)
ALTER TABLE "beans_share" ALTER COLUMN "status" SET DEFAULT 'pending';
