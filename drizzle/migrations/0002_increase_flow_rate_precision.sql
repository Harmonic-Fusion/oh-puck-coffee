-- Increase flow_rate precision from numeric(4,2) to numeric(5,2)
-- This allows flow rates up to 999.99 g/s instead of 99.99 g/s
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shots'
      AND column_name = 'flow_rate'
      AND numeric_precision = 4
      AND numeric_scale = 2
  ) THEN
    ALTER TABLE "shots" ALTER COLUMN "flow_rate" TYPE numeric(5,2);
  END IF;
END $$;
