-- Add bitter and sour columns to shots table
-- Migration is idempotent: safe to run multiple times

-- Add bitter column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'bitter'
  ) THEN
    ALTER TABLE "shots" ADD COLUMN "bitter" numeric(3, 1);
  END IF;
END $$;

-- Add sour column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shots' AND column_name = 'sour'
  ) THEN
    ALTER TABLE "shots" ADD COLUMN "sour" numeric(3, 1);
  END IF;
END $$;
