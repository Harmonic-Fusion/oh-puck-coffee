-- Add unshared_at to beans_share.
-- When an owner removes a member, this is set to the current timestamp instead of deleting
-- the row. The member retains read-only access to the bean and their own shots, but loses
-- the ability to see other members' shots, reshare, or perform any sharing actions.

ALTER TABLE "beans_share" ADD COLUMN IF NOT EXISTS "unshared_at" timestamp;
