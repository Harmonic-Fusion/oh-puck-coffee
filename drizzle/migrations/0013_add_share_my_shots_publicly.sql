-- Add share_my_shots_publicly to user_beans (opt-in to include own shots on public bean page).
-- Idempotent: safe to run multiple times.

ALTER TABLE "user_beans" ADD COLUMN IF NOT EXISTS "share_my_shots_publicly" boolean DEFAULT false NOT NULL;
