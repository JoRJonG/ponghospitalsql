-- Migration: Add view_count to activities and announcements tables
-- Date: 2025-10-20

USE ponghospital;

-- Add view_count to activities table
ALTER TABLE activities ADD COLUMN view_count INT DEFAULT 0;

-- Add view_count to announcements table
ALTER TABLE announcements ADD COLUMN view_count INT DEFAULT 0;

-- Update existing records to have view_count = 0 (if not already set by DEFAULT)
UPDATE activities SET view_count = 0 WHERE view_count IS NULL;

UPDATE announcements SET view_count = 0 WHERE view_count IS NULL;