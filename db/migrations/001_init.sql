CREATE TABLE feedback (
  id BIGSERIAL PRIMARY KEY,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 10000),
  email VARCHAR(320) CHECK (
    email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (
    sentiment IN ('positive', 'neutral', 'negative')
  ),
  tags TEXT[] NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  next_action TEXT NOT NULL
);

CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX idx_feedback_sentiment ON feedback (sentiment);
CREATE INDEX idx_feedback_tags ON feedback USING GIN (tags);
