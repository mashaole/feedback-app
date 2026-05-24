-- Speeds lookups by submitter without indexing NULL rows or enforcing uniqueness.
CREATE INDEX idx_feedback_email ON feedback (email) WHERE email IS NOT NULL;
