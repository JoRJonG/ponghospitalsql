ALTER TABLE users
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

UPDATE users
    SET is_active = 1
    WHERE is_active IS NULL;
