-- origins / roasters were created with serial (integer) PKs; app + Drizzle use text nanoid IDs.
-- Idempotent: only alters when id / FK columns are still integer types.

DO $$
BEGIN
  ALTER TABLE "beans" DROP CONSTRAINT IF EXISTS "beans_origin_id_origins_id_fk";
  ALTER TABLE "beans" DROP CONSTRAINT IF EXISTS "beans_roaster_id_roasters_id_fk";

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'origin_id'
    AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE "beans" ALTER COLUMN "origin_id" TYPE text USING origin_id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans' AND column_name = 'roaster_id'
    AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE "beans" ALTER COLUMN "roaster_id" TYPE text USING roaster_id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'origins' AND column_name = 'id'
    AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE "origins" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "origins" ALTER COLUMN "id" TYPE text USING id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roasters' AND column_name = 'id'
    AND data_type IN ('integer', 'bigint', 'smallint')
  ) THEN
    ALTER TABLE "roasters" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "roasters" ALTER COLUMN "id" TYPE text USING id::text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_origin_id_origins_id_fk') THEN
    ALTER TABLE "beans" ADD CONSTRAINT "beans_origin_id_origins_id_fk"
      FOREIGN KEY ("origin_id") REFERENCES "public"."origins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beans_roaster_id_roasters_id_fk') THEN
    ALTER TABLE "beans" ADD CONSTRAINT "beans_roaster_id_roasters_id_fk"
      FOREIGN KEY ("roaster_id") REFERENCES "public"."roasters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;
