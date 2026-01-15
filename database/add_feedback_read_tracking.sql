-- เพิ่มฟิลด์ read_by และ read_at ในตาราง feedback
ALTER TABLE feedback 
ADD COLUMN read_by VARCHAR(100) NULL COMMENT 'ชื่อผู้ดูแลที่อ่าน' AFTER status,
ADD COLUMN read_at TIMESTAMP NULL COMMENT 'วันที่อ่าน' AFTER read_by;
