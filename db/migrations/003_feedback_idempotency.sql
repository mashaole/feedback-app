-- Maps client's Idempotency-Key header to persisted feedback rows (replay on duplicate key).
CREATE TABLE feedback_idempotency (
  request_key VARCHAR(255) PRIMARY KEY,
  feedback_id BIGINT NOT NULL REFERENCES feedback (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_idempotency_feedback_id_idx
  ON feedback_idempotency (feedback_id);
