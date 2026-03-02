-- Make dose_grams, yield_grams, and yield_actual_grams nullable
-- Migration is idempotent: safe to run multiple times

-- Step 1: Make dose_grams nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'dose_grams'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "dose_grams" DROP NOT NULL;
  END IF;
END $$;

-- Step 2: Make yield_grams nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'yield_grams'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "yield_grams" DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Make yield_actual_grams nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'yield_actual_grams'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "yield_actual_grams" DROP NOT NULL;
  END IF;
END $$;
