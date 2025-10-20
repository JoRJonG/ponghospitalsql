-- คัดลอกทั้งหมดแล้ววางใน phpMyAdmin (http://localhost/phpmyadmin)
-- กด Ctrl+A เพื่อเลือกทั้งหมด, คัดลอก, แล้ววางใน SQL tab

-- 1. ลบ database เก่า
DROP DATABASE IF EXISTS ponghospital;

-- 2. สร้าง database ใหม่
CREATE DATABASE ponghospital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ponghospital;

-- 3. สร้างตาราง Users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    roles JSON DEFAULT ('["admin"]'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. สร้างตาราง Categories
CREATE TABLE announcement_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. สร้างตาราง Announcements
CREATE TABLE announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    category_id INT NOT NULL,
    content TEXT,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES announcement_categories(id)
);

-- 6. สร้าง View สำหรับ Announcements
CREATE VIEW announcement_details AS
SELECT 
    a.id,
    a.title,
    c.display_name as category_name,
    c.name as category_code,
    a.content,
    a.published_at,
    a.is_published,
    a.created_by,
    a.updated_by,
    a.created_at,
    a.updated_at
FROM announcements a
JOIN announcement_categories c ON a.category_id = c.id;

-- 7. สร้างตาราง Announcement Attachments
CREATE TABLE announcement_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    announcement_id INT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    public_id VARCHAR(255),
    kind ENUM('image', 'pdf', 'file') DEFAULT 'image',
    name VARCHAR(255),
    bytes INT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
);

-- 8. สร้างตาราง Activities
CREATE TABLE activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    date DATE,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. สร้างตาราง Activity Images
CREATE TABLE activity_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL,
    url VARCHAR(1000) NOT NULL,
    public_id VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- 10. สร้างตาราง Slides (ใช้ URL ก่อน ยังไม่ใช้ BLOB)
CREATE TABLE slides (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    caption TEXT,
    alt VARCHAR(255),
    href VARCHAR(1000),
    image_url VARCHAR(1000) NOT NULL,
    image_public_id VARCHAR(255),
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 11. สร้างตาราง Units
CREATE TABLE units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    href VARCHAR(1000),
    image_url VARCHAR(1000),
    image_public_id VARCHAR(255),
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. เพิ่มข้อมูลเริ่มต้น
INSERT INTO announcement_categories (name, display_name) VALUES
('job', 'สมัครงาน'),
('pr', 'ประชาสัมพันธ์'),
('announce', 'ประกาศ');

-- เสร็จสิ้น! ตอนนี้รีสตาร์ทเซิร์ฟเวอร์ด้วยการพิมพ์ rs ใน terminal