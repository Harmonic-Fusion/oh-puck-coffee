-- Update shot requirements: make grinder_id and shot_quality nullable, make yield_actual_grams required
-- Migration is idempotent: safe to run multiple times

-- Step 1: Make grinder_id nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'grinder_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "grinder_id" DROP NOT NULL;
  END IF;
END $$;

-- Step 2: Make shot_quality nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'shot_quality'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "shot_quality" DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Update any NULL yield_actual_grams to match yield_grams (for existing data)
-- Handle cases where yield_grams might also be NULL by using a default value
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'yield_actual_grams'
  ) THEN
    -- First, update rows where yield_grams is NOT NULL
    UPDATE "shots"
    SET "yield_actual_grams" = "yield_grams"
    WHERE "yield_actual_grams" IS NULL
      AND "yield_grams" IS NOT NULL;
    
    -- Then, handle rows where both are NULL (use a default of 0, but this should be rare)
    -- Note: This should not happen if yield_grams is also NOT NULL, but handle it just in case
    UPDATE "shots"
    SET "yield_actual_grams" = '0'
    WHERE "yield_actual_grams" IS NULL;
  END IF;
END $$;

-- Step 4: Make yield_actual_grams NOT NULL
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'yield_actual_grams'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "yield_actual_grams" SET NOT NULL;
  END IF;
END $$;
