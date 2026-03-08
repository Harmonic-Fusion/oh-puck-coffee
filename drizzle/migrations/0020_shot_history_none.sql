-- Add 'none' for shot history: never share. Migrate existing 'restricted' (only me) to 'none'.
-- After this, 'restricted' means "only other bean members"; new rows default to 'restricted' in app schema.
-- Idempotent: second run updates 0 rows (no 'restricted' left).

UPDATE beans_share
SET shot_history_access = 'none'
WHERE shot_history_access = 'restricted';
