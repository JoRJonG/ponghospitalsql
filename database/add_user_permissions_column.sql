ALTER TABLE users
  ADD COLUMN permissions JSON NOT NULL DEFAULT (JSON_ARRAY());

-- Ensure existing rows have a JSON array value
UPDATE users
SET permissions = JSON_ARRAY()
WHERE permissions IS NULL;
