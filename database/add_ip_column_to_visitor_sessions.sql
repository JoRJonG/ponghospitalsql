-- Migration: add plain IP column to visitor_sessions
-- Date: 2025-11-01

USE ponghospital;

ALTER TABLE visitor_sessions
  ADD COLUMN ip_address VARCHAR(45) NULL AFTER ip_hash;

CREATE INDEX idx_visit_date_ip_address ON visitor_sessions (visit_date, ip_address);
