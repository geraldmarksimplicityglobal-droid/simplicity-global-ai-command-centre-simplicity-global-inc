-- SG-AIF-001 durable workflow persistence — additive migration.
-- Apply only after the reviewed base schema and security/RLS migration.
-- This migration does not provision a database or enable external execution.

BEGIN;

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  created_by uuid NOT NULL REFERENCES app_users(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  objective text NOT NULL CHECK (length(objective) BETWEEN 1 AND 5000),
  risk_level text NOT NULL CHECK (risk_level IN ('low','medium','high')),
  status text NOT NULL CHECK (status IN (
    'submitted','inspected','planned','awaiting_approval','approved',
    'execution_authorized','executing','validating','completed',
    'rejected','failed','cancelled'
  )),
  repository text,
  branch text,
  task_data jsonb NOT NULL CHECK (jsonb_typeof(task_data) = 'object'),
  last_event_sequence integer NOT NULL DEFAULT 0 CHECK (last_event_sequence >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, id)
);

CREATE TABLE IF NOT EXISTS workflow_task_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  task_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 120),
  actor_user_id uuid NOT NULL REFERENCES app_users(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, task_id, sequence),
  FOREIGN KEY (organisation_id, task_id)
    REFERENCES workflow_tasks(organisation_id, id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_org_updated
  ON workflow_tasks(organisation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_org_status
  ON workflow_tasks(organisation_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_org_task_sequence
  ON workflow_task_events(organisation_id, task_id, sequence);

ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_task_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_tasks_org_scope ON workflow_tasks;
CREATE POLICY workflow_tasks_org_scope ON workflow_tasks
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

DROP POLICY IF EXISTS workflow_task_events_org_scope ON workflow_task_events;
CREATE POLICY workflow_task_events_org_scope ON workflow_task_events
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE OR REPLACE FUNCTION public.sg_prevent_workflow_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'workflow_task_events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS workflow_task_events_no_mutation ON workflow_task_events;
CREATE TRIGGER workflow_task_events_no_mutation
  BEFORE UPDATE OR DELETE ON workflow_task_events
  FOR EACH ROW EXECUTE FUNCTION public.sg_prevent_workflow_event_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON workflow_task_events FROM PUBLIC;

INSERT INTO permissions(permission_key, description) VALUES
  ('workflow:read', 'Read organisation-scoped workflow tasks and event history'),
  ('workflow:request', 'Create workflow task requests'),
  ('workflow:manage', 'Advance non-approval workflow task states'),
  ('workflow:approve', 'Record workflow task review decisions'),
  ('workflow:authorize', 'Grant separately scoped workflow execution authorization')
ON CONFLICT (permission_key) DO NOTHING;

COMMIT;

-- Runtime role grants are maintained separately in runtime-grants.template.sql.
-- Do not grant these permissions to user roles automatically. An administrator
-- must assign them to explicitly approved organisation roles.
-- The event table records state transitions only; it does not execute commands.
