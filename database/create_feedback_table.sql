-- สร้างตาราง feedback สำหรับเก็บข้อมูลความคิดเห็นจากผู้ใช้งาน
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ส่งความคิดเห็น',
  email VARCHAR(255) NULL COMMENT 'อีเมลผู้ส่ง (ไม่บังคับ)',
  phone VARCHAR(20) NULL COMMENT 'เบอร์โทรศัพท์ (ไม่บังคับ)',
  subject VARCHAR(200) NOT NULL COMMENT 'หัวข้อความคิดเห็น',
  message TEXT NOT NULL COMMENT 'ข้อความความคิดเห็น',
  status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new' COMMENT 'สถานะความคิดเห็น',
  admin_reply TEXT NULL COMMENT 'คำตอบจากผู้ดูแลระบบ',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้าง',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่อัปเดตล่าสุด',
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บข้อมูลความคิดเห็นจากผู้ใช้งาน';
