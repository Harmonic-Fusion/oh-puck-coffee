-- One-way sharing: remove public. Migrate existing public beans to anyone_with_link.
UPDATE "beans"
SET "general_access" = 'anyone_with_link'
WHERE "general_access" = 'public';

-- Shot history: remove public. Migrate existing public to anyone_with_link.
UPDATE "beans_share"
SET "shot_history_access" = 'anyone_with_link'
WHERE "shot_history_access" = 'public';
