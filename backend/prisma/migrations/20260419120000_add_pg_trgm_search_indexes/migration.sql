-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on searchable text columns
CREATE INDEX idx_customers_company_name_trgm ON customers USING gin (company_name gin_trgm_ops);
CREATE INDEX idx_customers_industry_trgm ON customers USING gin (industry gin_trgm_ops);
CREATE INDEX idx_contacts_first_name_trgm ON contacts USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_contacts_last_name_trgm ON contacts USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_contacts_email_trgm ON contacts USING gin (email gin_trgm_ops);
CREATE INDEX idx_deals_title_trgm ON deals USING gin (title gin_trgm_ops);
CREATE INDEX idx_notes_title_trgm ON notes USING gin (title gin_trgm_ops);
CREATE INDEX idx_notes_body_trgm ON notes USING gin (body gin_trgm_ops);
CREATE INDEX idx_activities_title_trgm ON activities USING gin (title gin_trgm_ops);
CREATE INDEX idx_reminders_title_trgm ON reminders USING gin (title gin_trgm_ops);
