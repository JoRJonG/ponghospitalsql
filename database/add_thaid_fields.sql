ALTER TABLE users ADD COLUMN thaid_pid VARCHAR(13) NULL UNIQUE COMMENT 'เลขบัตรประชาชน 13 หลัก';
ALTER TABLE users ADD COLUMN thaid_sub VARCHAR(255) NULL UNIQUE COMMENT 'ThaID Subject Identifier';
ALTER TABLE users ADD COLUMN thaid_linked_at DATETIME NULL COMMENT 'วันที่เชื่อมต่อ ThaID';
ALTER TABLE users ADD COLUMN login_method ENUM('local', 'thaid', 'both') DEFAULT 'local';

CREATE INDEX idx_thaid_pid ON users(thaid_pid);
CREATE INDEX idx_thaid_sub ON users(thaid_sub);
