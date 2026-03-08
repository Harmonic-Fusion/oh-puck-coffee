-- Change beans.id (and referencing columns) from uuid to text so app can use nanoid-style IDs (e.g. b_xxx).
-- Idempotent: only runs when beans.id is still uuid.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    -- Drop FKs that reference beans.id
    ALTER TABLE "shots" DROP CONSTRAINT IF EXISTS "shots_bean_id_beans_id_fk";
    ALTER TABLE "beans_share" DROP CONSTRAINT IF EXISTS "beans_share_bean_id_beans_id_fk";
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') THEN
      ALTER TABLE "user_beans" DROP CONSTRAINT IF EXISTS "user_beans_bean_id_beans_id_fk";
    END IF;

    -- Alter column types (uuid -> text), preserving existing values as string form
    ALTER TABLE "beans" ALTER COLUMN "id" TYPE text USING id::text;
    ALTER TABLE "shots" ALTER COLUMN "bean_id" TYPE text USING bean_id::text;
    ALTER TABLE "beans_share" ALTER COLUMN "bean_id" TYPE text USING bean_id::text;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') THEN
      ALTER TABLE "user_beans" ALTER COLUMN "bean_id" TYPE text USING bean_id::text;
    END IF;

    -- Re-add foreign keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shots_bean_id_beans_id_fk') THEN
      ALTER TABLE "shots" ADD CONSTRAINT "shots_bean_id_beans_id_fk"
        FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_share_bean_id_beans_id_fk') THEN
      ALTER TABLE "beans_share" ADD CONSTRAINT "beans_share_bean_id_beans_id_fk"
        FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_beans') AND
       NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_beans_bean_id_beans_id_fk') THEN
      ALTER TABLE "user_beans" ADD CONSTRAINT "user_beans_bean_id_beans_id_fk"
        FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;
