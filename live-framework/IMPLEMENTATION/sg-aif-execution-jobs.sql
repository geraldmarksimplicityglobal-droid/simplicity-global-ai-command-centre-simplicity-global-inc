-- SG-AUTO-001 durable background execution queue.
-- Apply only to reviewed ephemeral/test databases until separately approved.
BEGIN;

CREATE TABLE IF NOT EXISTS aif_execution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  requester_user_id uuid NOT NULL REFERENCES app_users(id),
  idempotency_key text,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 20),
  worker_id text,
  lease_until timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(result)='object'),
  last_error_code text CHECK (last_error_code IS NULL OR last_error_code ~ '^[a-z0-9_]{1,80}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (organisation_id,id),
  CHECK (
    payload ? 'objective' AND jsonb_typeof(payload->'objective')='string'
    AND payload ? 'capabilities' AND jsonb_typeof(payload->'capabilities')='array'
    AND payload ? 'risk' AND payload->>'risk' IN ('read_only','reversible')
  ),
  CHECK ((status='running') = (worker_id IS NOT NULL AND lease_until IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_aif_execution_jobs_idempotency
  ON aif_execution_jobs(organisation_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aif_execution_jobs_claim
  ON aif_execution_jobs(organisation_id,status,created_at)
  WHERE status IN ('queued','running');
CREATE INDEX IF NOT EXISTS idx_aif_execution_jobs_requester
  ON aif_execution_jobs(organisation_id,requester_user_id,created_at DESC);

ALTER TABLE aif_execution_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY aif_execution_jobs_select ON aif_execution_jobs FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_execution_jobs_insert ON aif_execution_jobs FOR INSERT
  WITH CHECK (
    public.sg_has_organisation_membership(organisation_id)
    AND requester_user_id = (SELECT u.id FROM public.app_users u WHERE u.identity_issuer = current_setting('app.user_issuer', true) AND u.identity_subject = current_setting('app.user_subject', true) AND u.status='active' LIMIT 1)
  );
CREATE POLICY aif_execution_jobs_update ON aif_execution_jobs FOR UPDATE
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

COMMIT;
