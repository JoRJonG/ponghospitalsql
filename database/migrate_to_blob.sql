-- Migration: เปลี่ยนจาก URL เป็น BLOB storage
-- รันใน phpMyAdmin หลังจากที่มีข้อมูลอยู่แล้ว
USE ponghospital;

-- 1. แก้ไขตาราง slides ให้รองรับ BLOB
ALTER TABLE slides 
DROP COLUMN image_url,
DROP COLUMN image_public_id,
ADD COLUMN image_data LONGBLOB AFTER href,
ADD COLUMN mime_type VARCHAR(100) AFTER image_data,
ADD COLUMN file_size INT AFTER mime_type,
ADD COLUMN file_name VARCHAR(255) AFTER file_size;

-- 2. แก้ไขตาราง units ให้รองรับ BLOB
ALTER TABLE units
DROP COLUMN image_url,
DROP COLUMN image_public_id,
ADD COLUMN image_data LONGBLOB AFTER href,
ADD COLUMN mime_type VARCHAR(100) AFTER image_data,
ADD COLUMN file_size INT AFTER mime_type,
ADD COLUMN file_name VARCHAR(255) AFTER file_size;

-- 3. แก้ไขตาราง activity_images ให้รองรับ BLOB
ALTER TABLE activity_images
DROP COLUMN url,
DROP COLUMN public_id,
ADD COLUMN image_data LONGBLOB AFTER activity_id,
ADD COLUMN mime_type VARCHAR(100) AFTER image_data,
ADD COLUMN file_size INT AFTER mime_type,
ADD COLUMN file_name VARCHAR(255) AFTER file_size;

-- 4. แก้ไขตาราง announcement_attachments ให้รองรับ BLOB
ALTER TABLE announcement_attachments
DROP COLUMN url,
DROP COLUMN public_id,
ADD COLUMN file_data LONGBLOB AFTER announcement_id,
ADD COLUMN mime_type VARCHAR(100) AFTER file_data,
ADD COLUMN file_size INT AFTER mime_type,
ADD COLUMN file_name VARCHAR(255) AFTER file_size;

-- เสร็จสิ้น!
