-- Optimization indexes for visitor_sessions table
-- Date: 2025-11-13

USE ponghospital;

-- Index for recent sessions query (ORDER BY last_seen DESC)
CREATE INDEX IF NOT EXISTS idx_last_seen ON visitor_sessions(last_seen DESC);

-- Composite index for date range + user agent queries
CREATE INDEX IF NOT EXISTS idx_visit_date_user_agent ON visitor_sessions(visit_date, user_agent);

-- Composite index for filtering by date and ordering by last_seen
CREATE INDEX IF NOT EXISTS idx_visit_date_last_seen ON visitor_sessions(visit_date, last_seen DESC);

-- Show the indexes
SHOW INDEXES FROM visitor_sessions;
