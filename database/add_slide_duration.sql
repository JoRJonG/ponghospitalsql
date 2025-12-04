-- Migration: เพิ่มฟิลด์ duration สำหรับกำหนดเวลาการแสดงสไลด์
-- รันใน phpMyAdmin หรือ MySQL client
USE ponghospital;

-- เพิ่มฟิลด์ duration ให้กับตาราง slides
ALTER TABLE slides
ADD COLUMN duration INT DEFAULT 5 COMMENT 'ระยะเวลาการแสดงสไลด์ (วินาที), ค่าเริ่มต้น 5 วินาที';