-- Add indexes for better query performance

-- Announcements: Filtering by published status and date is very common
CREATE INDEX idx_announcements_published ON announcements(is_published, published_at);
-- Announcements: Filtering by category
CREATE INDEX idx_announcements_category ON announcements(category_id);

-- Activities: Filtering by published status and date
CREATE INDEX idx_activities_published ON activities(is_published, published_at);

-- Units: Filtering by published status
CREATE INDEX idx_units_published ON units(is_published);

-- Slides: Filtering by published status
CREATE INDEX idx_slides_published ON slides(is_published);
