ALTER TABLE homepage_popups
  ADD COLUMN image_data LONGBLOB NULL AFTER image_url,
  ADD COLUMN image_mime VARCHAR(120) NULL AFTER image_data,
  ADD COLUMN image_name VARCHAR(255) NULL AFTER image_mime,
  ADD COLUMN image_size INT NULL AFTER image_name;
