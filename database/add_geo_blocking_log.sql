-- Create table for logging geo-blocked access attempts
CREATE TABLE IF NOT EXISTS geo_blocking_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  user_agent VARCHAR(500),
  path VARCHAR(255),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip (ip_address),
  INDEX idx_country (country_code),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
