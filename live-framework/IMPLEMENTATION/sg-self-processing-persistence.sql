-- SG Self-Processing Part VI: persistent, bounded loop governance.
-- This migration records loops, leases, events and adaptation proposals only.
-- It creates no scheduler, worker, payment sender, or autonomous policy deployment.
BEGIN;

CREATE TABLE IF NOT EXISTS aif_loop_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  intent_reference text NOT NULL,
  correlation_id uuid NOT NULL,
  loop_type text NOT NULL CHECK (loop_type IN ('single_intent','pipeline','fan_out_fan_in','saga')),
  current_stage text NOT NULL CHECK (current_stage IN
    ('created','validated','screened','mandate_ok','approved','sent','pending','settled',
     'reconciled','closed','held','unknown','query_pending','failed_transient','failed_terminal','dead_letter','returned','cancelled')),
  priority_class text NOT NULL CHECK (priority_class IN ('P0','P1','P2','P3')),
  iteration_count integer NOT NULL DEFAULT 0 CHECK (iteration_count >= 0),
  max_iterations integer NOT NULL CHECK (max_iterations BETWEEN 1 AND 100),
  budget_tokens bigint NOT NULL CHECK (budget_tokens >= 0),
  budget_usd numeric(18,6) NOT NULL CHECK (budget_usd >= 0),
  budget_seconds integer NOT NULL CHECK (budget_seconds >= 0),
  policy_version text NOT NULL,
  semantic_memory_version text NOT NULL,
  executor_enabled boolean NOT NULL DEFAULT false CHECK (executor_enabled = false),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,id),
  CHECK (iteration_count <= max_iterations)
);
CREATE INDEX IF NOT EXISTS idx_aif_loop_runs_queue
  ON aif_loop_runs(organisation_id,priority_class,created_at)
  WHERE current_stage NOT IN ('closed','cancelled','failed_terminal','dead_letter');

CREATE TABLE IF NOT EXISTS aif_loop_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  resource_key text NOT NULL,
  holder_identity text NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  UNIQUE (organisation_id,resource_key,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aif_loop_active_lease
  ON aif_loop_leases(organisation_id,resource_key)
  WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS aif_loop_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  loop_run_id uuid NOT NULL,
  sequence_number bigint NOT NULL CHECK (sequence_number > 0),
  event_type text NOT NULL,
  stage text NOT NULL,
  actor_identity text NOT NULL,
  payload_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash char(64),
  event_hash char(64) NOT NULL CHECK (event_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,loop_run_id,sequence_number),
  FOREIGN KEY (organisation_id,loop_run_id) REFERENCES aif_loop_runs(organisation_id,id)
);
CREATE INDEX IF NOT EXISTS idx_aif_loop_events_trace
  ON aif_loop_events(organisation_id,loop_run_id,sequence_number);

CREATE TABLE IF NOT EXISTS aif_memory_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  memory_tier text NOT NULL CHECK (memory_tier IN ('episodic','semantic','procedural')),
  memory_key text NOT NULL,
  proposed_value jsonb NOT NULL,
  source_loop_id uuid,
  content_hash char(64) NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  proposed_by uuid NOT NULL REFERENCES app_users(id),
  reviewed_by uuid REFERENCES app_users(id),
  review_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  FOREIGN KEY (organisation_id,source_loop_id) REFERENCES aif_loop_runs(organisation_id,id),
  CHECK (status = 'pending_review' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by <> proposed_by))
);

CREATE TABLE IF NOT EXISTS aif_adaptation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  adaptation_key text NOT NULL,
  prior_value jsonb NOT NULL,
  proposed_value jsonb NOT NULL,
  approved_min jsonb NOT NULL,
  approved_max jsonb NOT NULL,
  rationale text NOT NULL,
  evaluation_reference text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved_for_staging','rejected','rolled_back')),
  proposed_by uuid NOT NULL REFERENCES app_users(id),
  reviewed_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK (status = 'pending_review' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by <> proposed_by))
);

CREATE TABLE IF NOT EXISTS aif_loop_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  loop_run_id uuid,
  severity text NOT NULL CHECK (severity IN ('P1','P2','P3')),
  incident_type text NOT NULL,
  action_taken text NOT NULL,
  evidence_hash char(64) NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  resolved_by uuid REFERENCES app_users(id),
  resolved_at timestamptz,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organisation_id,loop_run_id) REFERENCES aif_loop_runs(organisation_id,id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aif_loop_runs','aif_loop_leases','aif_loop_events','aif_memory_proposals',
    'aif_adaptation_events','aif_loop_incidents'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (public.sg_has_organisation_membership(organisation_id))',t || '_org_select',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (public.sg_has_organisation_membership(organisation_id))',t || '_org_insert',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'aif_loop_runs','aif_loop_leases','aif_memory_proposals',
    'aif_adaptation_events','aif_loop_incidents'
  ] LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (public.sg_has_organisation_membership(organisation_id)) WITH CHECK (public.sg_has_organisation_membership(organisation_id))',t || '_org_update',t);
  END LOOP;
END $$;

DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('aif_loop_runs','created_by'),
    ('aif_memory_proposals','proposed_by'),
    ('aif_adaptation_events','proposed_by'),
    ('aif_loop_incidents','created_by')
  ) AS v(table_name,actor_column) LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.sg_aif_validate_actor(%L)',
      item.table_name || '_actor',item.table_name,item.actor_column);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.sg_aif_guard_memory_review()
RETURNS trigger LANGUAGE plpgsql AS $aif$
BEGIN
  IF NEW.status <> 'pending_review' AND
     (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL OR NEW.reviewed_by = NEW.proposed_by) THEN
    RAISE EXCEPTION 'memory proposal requires independent human review' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$aif$;
CREATE TRIGGER aif_memory_proposals_review_guard
  BEFORE UPDATE ON aif_memory_proposals
  FOR EACH ROW EXECUTE FUNCTION public.sg_aif_guard_memory_review();

CREATE OR REPLACE FUNCTION public.sg_aif_guard_adaptation_review()
RETURNS trigger LANGUAGE plpgsql AS $aif$
BEGIN
  IF NEW.status <> 'pending_review' AND
     (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL OR NEW.reviewed_by = NEW.proposed_by) THEN
    RAISE EXCEPTION 'adaptation requires independent human review' USING ERRCODE='55000';
  END IF;
  IF NEW.status = 'approved_for_staging' AND NEW.evaluation_reference IS NULL THEN
    RAISE EXCEPTION 'adaptation requires evaluation evidence' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$aif$;
CREATE TRIGGER aif_adaptation_events_review_guard
  BEFORE UPDATE ON aif_adaptation_events
  FOR EACH ROW EXECUTE FUNCTION public.sg_aif_guard_adaptation_review();

CREATE OR REPLACE FUNCTION public.sg_aif_loop_events_immutable()
RETURNS trigger LANGUAGE plpgsql AS $aif$
BEGIN
  RAISE EXCEPTION 'loop forensics are append-only' USING ERRCODE='55000';
END;
$aif$;
CREATE TRIGGER aif_loop_events_immutable
  BEFORE UPDATE OR DELETE ON aif_loop_events
  FOR EACH ROW EXECUTE FUNCTION public.sg_aif_loop_events_immutable();

COMMIT;
