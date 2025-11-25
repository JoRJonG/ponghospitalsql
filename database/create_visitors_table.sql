-- Migration: Create visitors table for website visitor tracking
-- Date: 2025-10-22

USE ponghospital;

-- Create visitors table to track website visits
CREATE TABLE visitors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    visit_date DATE NOT NULL,
    visit_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_visit_date (visit_date)
);

-- Insert initial record for today
INSERT INTO visitors (visit_date, visit_count) VALUES (CURDATE(), 0)
ON DUPLICATE KEY UPDATE visit_count = visit_count;