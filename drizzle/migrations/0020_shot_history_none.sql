-- Add 'none' for shot history: never share. Migrate existing 'restricted' (only me) to 'none'.
-- After this, 'restricted' means "only other bean members"; new rows default to 'restricted' in app schema.
-- Idempotent: second run updates 0 rows (no 'restricted' left).
-- Guard: older journal-only DBs may not have shot_history_access yet (column added in a later schema step).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beans_share' AND column_name = 'shot_history_access'
  ) THEN
    UPDATE beans_share
    SET shot_history_access = 'none'
    WHERE shot_history_access = 'restricted';
  END IF;
END $$;
