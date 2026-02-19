-- Make grind_level nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'grind_level'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "grind_level" DROP NOT NULL;
  END IF;
END $$;
