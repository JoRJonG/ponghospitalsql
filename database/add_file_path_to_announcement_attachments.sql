ALTER TABLE announcement_attachments ADD COLUMN file_path VARCHAR(512) NULL;
ALTER TABLE announcement_attachments MODIFY COLUMN file_data LONGBLOB NULL;
