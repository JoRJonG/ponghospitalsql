-- Add phone_number column to executives table
ALTER TABLE executives 
ADD COLUMN phone VARCHAR(50) DEFAULT NULL COMMENT 'เบอร์โทรศัพท์' AFTER position;
