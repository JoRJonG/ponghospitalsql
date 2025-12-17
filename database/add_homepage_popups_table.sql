-- Adds homepage popups table for intro overlay content
CREATE TABLE IF NOT EXISTS homepage_popups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    dismiss_for_days INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    cta_label VARCHAR(120) NULL,
    cta_url VARCHAR(500) NULL,
    image_url VARCHAR(500) NULL,
    image_data LONGBLOB NULL,
    image_mime VARCHAR(120) NULL,
    image_name VARCHAR(255) NULL,
    image_size INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
