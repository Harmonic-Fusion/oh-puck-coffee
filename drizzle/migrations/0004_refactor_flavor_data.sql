-- Refactor flavor data: replace flavor_data jsonb and legacy columns with separate columns
-- Migration is idempotent: safe to run multiple times

-- Step 1: Add new columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavors'
  ) THEN
    ALTER TABLE "shots" ADD COLUMN "flavors" jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'body_texture'
  ) THEN
    ALTER TABLE "shots" ADD COLUMN "body_texture" jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'adjectives'
  ) THEN
    ALTER TABLE "shots" ADD COLUMN "adjectives" jsonb;
  END IF;
END $$;

-- Step 2: Migrate data from flavor_data to new columns (if flavor_data exists and new columns are null)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_data'
  ) THEN
    UPDATE "shots"
    SET
      "flavors" = COALESCE("flavors", ("flavor_data"->>'flavors')::jsonb),
      "body_texture" = COALESCE("body_texture", ("flavor_data"->>'body')::jsonb),
      "adjectives" = COALESCE("adjectives", ("flavor_data"->>'adjectives')::jsonb)
    WHERE "flavor_data" IS NOT NULL
      AND ("flavors" IS NULL OR "body_texture" IS NULL OR "adjectives" IS NULL);
  END IF;
END $$;

-- Step 3: Migrate data from legacy columns to new columns (if legacy columns exist and new columns are null)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_categories'
  ) THEN
    UPDATE "shots"
    SET "flavors" = COALESCE("flavors", (
      SELECT jsonb_agg(elem)
      FROM jsonb_each("flavor_wheel_categories") AS cat,
      LATERAL jsonb_array_elements_text(cat.value) AS elem
    ))
    WHERE "flavor_wheel_categories" IS NOT NULL AND "flavors" IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_body'
  ) THEN
    UPDATE "shots"
    SET "body_texture" = COALESCE("body_texture", 
      CASE 
        WHEN "flavor_wheel_body" IS NOT NULL THEN jsonb_build_array("flavor_wheel_body")
        ELSE NULL
      END
    )
    WHERE "flavor_wheel_body" IS NOT NULL AND "body_texture" IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_adjectives'
  ) THEN
    UPDATE "shots"
    SET "adjectives" = COALESCE("adjectives", "flavor_wheel_adjectives")
    WHERE "flavor_wheel_adjectives" IS NOT NULL AND "adjectives" IS NULL;
  END IF;
END $$;

-- Step 4: Drop indexes and constraints on old columns (if they exist)
-- Drop indexes that might reference the old columns
DO $$ 
DECLARE
  idx_record RECORD;
BEGIN
  FOR idx_record IN 
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'shots'
      AND (
        indexname LIKE '%flavor_data%' OR
        indexname LIKE '%flavor_wheel_categories%' OR
        indexname LIKE '%flavor_wheel_body%' OR
        indexname LIKE '%flavor_wheel_adjectives%'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', idx_record.indexname);
  END LOOP;
END $$;

-- Drop check constraints that might reference the old columns
DO $$ 
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN 
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.shots'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) LIKE '%flavor_data%' OR
        pg_get_constraintdef(oid) LIKE '%flavor_wheel_categories%' OR
        pg_get_constraintdef(oid) LIKE '%flavor_wheel_body%' OR
        pg_get_constraintdef(oid) LIKE '%flavor_wheel_adjectives%'
      )
  LOOP
    EXECUTE format('ALTER TABLE "shots" DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

-- Step 5: Drop old columns if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_data'
  ) THEN
    ALTER TABLE "shots" DROP COLUMN "flavor_data";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_categories'
  ) THEN
    ALTER TABLE "shots" DROP COLUMN "flavor_wheel_categories";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_body'
  ) THEN
    ALTER TABLE "shots" DROP COLUMN "flavor_wheel_body";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'flavor_wheel_adjectives'
  ) THEN
    ALTER TABLE "shots" DROP COLUMN "flavor_wheel_adjectives";
  END IF;
END $$;
