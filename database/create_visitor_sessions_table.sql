-- Migration: Create visitor_sessions table for granular session tracking
-- Date: 2025-11-01

USE ponghospital;

CREATE TABLE IF NOT EXISTS visitor_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_date DATE NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    ip_hash CHAR(64) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    path VARCHAR(255) DEFAULT NULL,
    hit_count INT NOT NULL DEFAULT 1,
    first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_visitor_session (visit_date, fingerprint),
    KEY idx_visit_date (visit_date),
    KEY idx_visit_ip (visit_date, ip_hash)
);
