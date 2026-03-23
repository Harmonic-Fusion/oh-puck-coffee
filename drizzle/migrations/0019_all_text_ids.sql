-- Convert all remaining uuid columns that should be text (app uses nanoid-style IDs).
-- Idempotent: only alters columns that are still uuid.

-- ========== 1. beans_share.id (no FKs reference it) ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE "beans_share" ALTER COLUMN "id" TYPE text USING id::text;
  END IF;
END $$;
--> statement-breakpoint

-- ========== 2. users.id and all columns that reference it ==========
DO $$
DECLARE
  users_id_is_uuid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id' AND data_type = 'uuid'
  ) INTO users_id_is_uuid;

  IF users_id_is_uuid THEN
    -- Drop FKs that reference users.id (only if they exist to avoid NOTICE that can break the driver)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_users_id_fk') THEN
      ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
      ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_user_id_users_id_fk') THEN
      ALTER TABLE "integrations" DROP CONSTRAINT "integrations_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedback_user_id_users_id_fk') THEN
      ALTER TABLE "feedback" DROP CONSTRAINT "feedback_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_user_id_users_id_fk') THEN
      ALTER TABLE "shots" DROP CONSTRAINT "shots_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_user_id_users_id_fk') THEN
      ALTER TABLE "beans_share" DROP CONSTRAINT "beans_share_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_sharer_user_id_users_id_fk') THEN
      ALTER TABLE "beans_share" DROP CONSTRAINT "beans_share_sharer_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_receiver_user_id_users_id_fk') THEN
      ALTER TABLE "beans_share" DROP CONSTRAINT "beans_share_receiver_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_invited_by_users_id_fk') THEN
      ALTER TABLE "beans_share" DROP CONSTRAINT "beans_share_invited_by_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_updated_by_users_id_fk') THEN
      ALTER TABLE "beans" DROP CONSTRAINT "beans_updated_by_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_updated_by_fkey') THEN
      ALTER TABLE "beans" DROP CONSTRAINT "beans_updated_by_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') AND
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_users_id_fk') THEN
      ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_entitlements') AND
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_entitlements_user_id_users_id_fk') THEN
      ALTER TABLE "user_entitlements" DROP CONSTRAINT "user_entitlements_user_id_users_id_fk";
    END IF;
    -- beans.created_by still uses the original FK name from 0000 after user_id → created_by rename (0012)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_user_id_users_id_fk') THEN
      ALTER TABLE "beans" DROP CONSTRAINT "beans_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_created_by_users_id_fk') THEN
      ALTER TABLE "beans" DROP CONSTRAINT "beans_created_by_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_shares_user_id_users_id_fk') THEN
      ALTER TABLE "shot_shares" DROP CONSTRAINT "shot_shares_user_id_users_id_fk";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') AND
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_beans_user_id_users_id_fk') THEN
      ALTER TABLE "user_beans" DROP CONSTRAINT "user_beans_user_id_users_id_fk";
    END IF;

    ALTER TABLE "users" ALTER COLUMN "id" TYPE text USING id::text;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "accounts" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "sessions" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "integrations" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "feedback" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "shots" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "beans_share" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'sharer_user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "beans_share" ALTER COLUMN "sharer_user_id" TYPE text USING sharer_user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'receiver_user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "beans_share" ALTER COLUMN "receiver_user_id" TYPE text USING receiver_user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'invited_by' AND data_type = 'uuid') THEN
      ALTER TABLE "beans_share" ALTER COLUMN "invited_by" TYPE text USING invited_by::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_by' AND data_type = 'uuid') THEN
      ALTER TABLE "beans" ALTER COLUMN "updated_by" TYPE text USING updated_by::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "subscriptions" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_entitlements') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_entitlements' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "user_entitlements" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'created_by' AND data_type = 'uuid') THEN
      ALTER TABLE "beans" ALTER COLUMN "created_by" TYPE text USING created_by::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shot_shares') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shot_shares' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "shot_shares" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_beans' AND column_name = 'user_id' AND data_type = 'uuid') THEN
      ALTER TABLE "user_beans" ALTER COLUMN "user_id" TYPE text USING user_id::text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_users_id_fk') THEN
      ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
      ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_user_id_users_id_fk') THEN
      ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedback_user_id_users_id_fk') THEN
      ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_user_id_users_id_fk') THEN
      ALTER TABLE "shots" ADD CONSTRAINT "shots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'user_id') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_user_id_users_id_fk') THEN
      ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'sharer_user_id') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_sharer_user_id_users_id_fk') THEN
      ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_sharer_user_id_users_id_fk" FOREIGN KEY ("sharer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'receiver_user_id') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_receiver_user_id_users_id_fk') THEN
      ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_receiver_user_id_users_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'invited_by') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_invited_by_users_id_fk') THEN
      ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'updated_by') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_updated_by_users_id_fk') THEN
      ALTER TABLE "beans" ADD CONSTRAINT "beans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_users_id_fk') THEN
      ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_entitlements') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_entitlements_user_id_users_id_fk') THEN
      ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_created_by_users_id_fk') THEN
      ALTER TABLE "beans" ADD CONSTRAINT "beans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shot_shares') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_shares_user_id_users_id_fk') THEN
      ALTER TABLE "shot_shares" ADD CONSTRAINT "shot_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_beans_user_id_users_id_fk') THEN
      ALTER TABLE "user_beans" ADD CONSTRAINT "user_beans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;
--> statement-breakpoint

-- ========== 3. grinders.id and shots.grinder_id ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grinders' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_grinder_id_grinders_id_fk') THEN
      ALTER TABLE "shots" DROP CONSTRAINT "shots_grinder_id_grinders_id_fk";
    END IF;
    ALTER TABLE "grinders" ALTER COLUMN "id" TYPE text USING id::text;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'grinder_id' AND data_type = 'uuid') THEN
      ALTER TABLE "shots" ALTER COLUMN "grinder_id" TYPE text USING grinder_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_grinder_id_grinders_id_fk') THEN
      ALTER TABLE "shots" ADD CONSTRAINT "shots_grinder_id_grinders_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "grinders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;
--> statement-breakpoint

-- ========== 4. machines.id and shots.machine_id ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_machine_id_machines_id_fk') THEN
      ALTER TABLE "shots" DROP CONSTRAINT "shots_machine_id_machines_id_fk";
    END IF;
    ALTER TABLE "machines" ALTER COLUMN "id" TYPE text USING id::text;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'machine_id' AND data_type = 'uuid') THEN
      ALTER TABLE "shots" ALTER COLUMN "machine_id" TYPE text USING machine_id::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_machine_id_machines_id_fk') THEN
      ALTER TABLE "shots" ADD CONSTRAINT "shots_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;
--> statement-breakpoint

-- ========== 5. shots.id (drop shot_shares FK first; align shot_shares.shot_id) ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_shares_shot_id_shots_id_fk') THEN
      ALTER TABLE "shot_shares" DROP CONSTRAINT "shot_shares_shot_id_shots_id_fk";
    END IF;
    ALTER TABLE "shots" ALTER COLUMN "id" TYPE text USING id::text;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shot_shares') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shot_shares' AND column_name = 'shot_id' AND data_type = 'uuid') THEN
      ALTER TABLE "shot_shares" ALTER COLUMN "shot_id" TYPE text USING shot_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shot_shares') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_shares_shot_id_shots_id_fk') THEN
      ALTER TABLE "shot_shares" ADD CONSTRAINT "shot_shares_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "shots"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;
--> statement-breakpoint

-- ========== 6. feedback.id ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE "feedback" ALTER COLUMN "id" TYPE text USING id::text;
  END IF;
END $$;
