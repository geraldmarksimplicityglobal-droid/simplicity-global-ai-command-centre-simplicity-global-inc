-- SG-AIF-001 / SG-FIN-ROUTE-001 persistent runtime migration.
-- Apply only to an ephemeral test database until reviewed and separately approved.
BEGIN;

CREATE TABLE IF NOT EXISTS aif_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  objective text NOT NULL CHECK (length(objective) BETWEEN 1 AND 4000),
  environment text NOT NULL CHECK (environment IN ('sandbox','development','staging','production')),
  autonomy_level text NOT NULL CHECK (autonomy_level IN (
    'L0','L0.0','L0.1','L1','L1.1','L1.2','L1.3',
    'L2','L2.1','L2.2','L2.3','L3','L3.1','L3.2','L3.3',
    'L4','L4.1','L4.2','L4.3','L4.4','L5','L5.1','L5.2','L5.3','L5.4'
  )),
  risk_level text NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  simulation_only boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','inspected','planned','awaiting_approval','approved','rejected','failed','simulated','cancelled')),
  current_stage text NOT NULL DEFAULT 'queued',
  requester_user_id uuid NOT NULL REFERENCES app_users(id),
  idempotency_key text,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_version integer NOT NULL DEFAULT 1 CHECK (state_version > 0),
  last_event_hash char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE (organisation_id,id),
  CHECK (environment <> 'production' OR autonomy_level NOT IN ('L4','L4.1','L4.2','L4.3','L4.4','L5','L5.1','L5.2','L5.3','L5.4')),
  CHECK (environment <> 'sandbox' OR autonomy_level NOT IN ('L4','L4.1','L4.2','L4.3','L4.4','L5','L5.1','L5.2','L5.3','L5.4') OR simulation_only = true),
  CHECK (simulation_only = false OR environment = 'sandbox')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_aif_workflow_idempotency
  ON aif_workflows(organisation_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aif_workflows_org_status
  ON aif_workflows(organisation_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS aif_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  workflow_id uuid NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES app_users(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash char(64),
  event_hash char(64) NOT NULL CHECK (event_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,workflow_id,sequence),
  FOREIGN KEY (organisation_id,workflow_id)
    REFERENCES aif_workflows(organisation_id,id)
);
CREATE INDEX IF NOT EXISTS idx_aif_workflow_events_sequence
  ON aif_workflow_events(organisation_id,workflow_id,sequence);

CREATE TABLE IF NOT EXISTS aif_memory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  memory_type text NOT NULL CHECK (memory_type IN ('working','episodic','semantic','procedural')),
  memory_key text NOT NULL CHECK (length(memory_key) BETWEEN 1 AND 200),
  value jsonb NOT NULL,
  classification text NOT NULL DEFAULT 'internal' CHECK (classification IN ('internal','confidential')),
  source_reference text,
  created_by uuid REFERENCES app_users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aif_memory_org_expiry
  ON aif_memory_records(organisation_id,expires_at DESC);

CREATE TABLE IF NOT EXISTS aif_plugin_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  plugin_id text NOT NULL,
  name text NOT NULL,
  version text NOT NULL,
  lifecycle_status text NOT NULL DEFAULT 'discovered'
    CHECK (lifecycle_status IN ('discovered','registered','unavailable','revoked')),
  connection_status text NOT NULL DEFAULT 'not_configured'
    CHECK (connection_status IN ('not_configured','connected','reauth_required','revoked','scope_insufficient','unknown')),
  manifest_sha256 char(64) NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  requested_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  discovered_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,plugin_id,version)
);
CREATE INDEX IF NOT EXISTS idx_aif_plugins_org_name
  ON aif_plugin_registry(organisation_id,name);

CREATE TABLE IF NOT EXISTS aif_config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  config_key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  configuration jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,config_key,version),
  UNIQUE (organisation_id,id)
);

CREATE TABLE IF NOT EXISTS aif_config_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  config_version_id uuid NOT NULL,
  approver_user_id uuid NOT NULL REFERENCES app_users(id),
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  rationale text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organisation_id,config_version_id)
    REFERENCES aif_config_versions(organisation_id,id)
);
CREATE INDEX IF NOT EXISTS idx_aif_config_approvals_latest
  ON aif_config_approvals(organisation_id,config_version_id,created_at DESC);

CREATE TABLE IF NOT EXISTS aif_config_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  config_version_id uuid NOT NULL,
  activated_by uuid NOT NULL REFERENCES app_users(id),
  activated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organisation_id,config_version_id)
    REFERENCES aif_config_versions(organisation_id,id)
);
CREATE INDEX IF NOT EXISTS idx_aif_config_activations_latest
  ON aif_config_activations(organisation_id,config_version_id,activated_at DESC);

CREATE TABLE IF NOT EXISTS financial_route_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  request_reference text NOT NULL,
  amount_minor numeric(38,0) NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  corridor text NOT NULL,
  candidate_routes jsonb NOT NULL DEFAULT '[]'::jsonb,
  hard_gates jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_status text NOT NULL CHECK (decision_status IN ('blocked','recommendation')),
  block_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_route jsonb,
  execution_allowed boolean NOT NULL DEFAULT false CHECK (execution_allowed = false),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (selected_route IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_financial_route_decisions_org_time
  ON financial_route_decisions(organisation_id,created_at DESC);

-- Permissions are not automatically assigned to existing users or roles.
INSERT INTO permissions(permission_key,description) VALUES
 ('aif:read','Read autonomous intelligence runtime records'),
 ('aif:write','Create bounded workflows and governed memory records'),
 ('aif:configure','Draft and activate independently approved AIF configuration'),
 ('aif:approve','Approve or reject AIF configuration versions'),
 ('financial-routing:read','Read financial route recommendations and blocked decisions'),
 ('financial-routing:prepare','Prepare a financial route proposal without executing it')
ON CONFLICT (permission_key) DO NOTHING;

-- Tenant isolation: every AIF/financial record is scoped to an organisation membership.
ALTER TABLE aif_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE aif_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aif_memory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aif_plugin_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE aif_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aif_config_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE aif_config_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_route_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY aif_workflows_select ON aif_workflows FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_workflows_insert ON aif_workflows FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_workflows_update ON aif_workflows FOR UPDATE
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY aif_workflow_events_select ON aif_workflow_events FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_workflow_events_insert ON aif_workflow_events FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY aif_memory_select ON aif_memory_records FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_memory_insert ON aif_memory_records FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY aif_plugins_select ON aif_plugin_registry FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_plugins_insert ON aif_plugin_registry FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY aif_config_versions_select ON aif_config_versions FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_config_versions_insert ON aif_config_versions FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY aif_config_approvals_select ON aif_config_approvals FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_config_approvals_insert ON aif_config_approvals FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY aif_config_activations_select ON aif_config_activations FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY aif_config_activations_insert ON aif_config_activations FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY financial_route_decisions_select ON financial_route_decisions FOR SELECT
  USING (public.sg_has_organisation_membership(organisation_id));
CREATE POLICY financial_route_decisions_insert ON financial_route_decisions FOR INSERT
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

-- Workflow event history, config versions, approvals, activations and route
-- decisions are append-only. Memory erasure remains an administrator/retention
-- operation and is not exposed through the application API.
CREATE OR REPLACE FUNCTION public.sg_aif_reject_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SG AIF records are append-only' USING ERRCODE='55000';
END;
$$;

DO $$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'aif_workflow_events','aif_config_versions','aif_config_approvals',
    'aif_config_activations','financial_route_decisions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_no_mutation ON %I',target_table,target_table);
    EXECUTE format(
      'CREATE TRIGGER %I_no_mutation BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.sg_aif_reject_mutation()',
      target_table,target_table
    );
  END LOOP;
END $$;

COMMIT;
