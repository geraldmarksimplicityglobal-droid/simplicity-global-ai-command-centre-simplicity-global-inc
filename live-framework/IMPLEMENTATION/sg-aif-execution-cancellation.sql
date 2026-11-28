-- SG-AUTO-001 cooperative cancellation for durable execution jobs.
-- Apply only after review; CI applies this migration to an ephemeral PostgreSQL database.
BEGIN;

ALTER TABLE aif_execution_jobs
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_aif_execution_jobs_cancel_requested
  ON aif_execution_jobs(organisation_id,worker_id)
  WHERE status='running' AND cancel_requested_at IS NOT NULL;

COMMIT;
