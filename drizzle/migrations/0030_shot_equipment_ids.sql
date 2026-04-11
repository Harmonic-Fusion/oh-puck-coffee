-- Optional ordered list of unified equipment UUIDs used for this shot (beyond single grinder/machine joins).
ALTER TABLE "shots" ADD COLUMN IF NOT EXISTS "equipment_ids" jsonb;
