-- Table for hospital executives/management team
CREATE TABLE IF NOT EXISTS executives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT 'ชื่อผู้บริหาร',
  position VARCHAR(255) NOT NULL COMMENT 'ตำแหน่ง',
  image_data LONGBLOB COMMENT 'รูปภาพผู้บริหาร',
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INT,
  display_order INT DEFAULT 0 COMMENT 'ลำดับการแสดงผล',
  is_published BOOLEAN DEFAULT TRUE COMMENT 'เผยแพร่หรือไม่',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_display_order (display_order),
  INDEX idx_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
