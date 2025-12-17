-- Adds a key/value store for global site configuration such as display mode
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by VARCHAR(100) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed the visitor-controlled mode if no record exists yet
INSERT INTO site_settings (setting_key, setting_value, updated_by)
SELECT 'display_mode', 'force-off', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings WHERE setting_key = 'display_mode'
);
