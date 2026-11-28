-- SG-FIN-ROUTE-001 Parts III-V persistence extension.
-- Proposal-only: no send queue can dispatch and no ledger journal can post.
BEGIN;

CREATE TABLE IF NOT EXISTS aif_agent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  agent_key text NOT NULL,
  role text NOT NULL CHECK (role IN ('intake','screening','router','executor','reconciler','auditor')),
  workload_identity text NOT NULL,
  public_key_fingerprint char(64) NOT NULL CHECK (public_key_fingerprint ~ '^[a-f0-9]{64}$'),
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,agent_key),
  UNIQUE (organisation_id,workload_identity)
);

CREATE TABLE IF NOT EXISTS aif_agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  trace_id uuid NOT NULL,
  from_agent_id uuid NOT NULL REFERENCES aif_agent_registry(id),
  to_agent_id uuid NOT NULL REFERENCES aif_agent_registry(id),
  intent_hash char(64) NOT NULL CHECK (intent_hash ~ '^[a-f0-9]{64}$'),
  capability_token_hash char(64) NOT NULL CHECK (capability_token_hash ~ '^[a-f0-9]{64}$'),
  payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  signature text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_agent_id <> to_agent_id)
);
CREATE INDEX IF NOT EXISTS idx_aif_agent_messages_trace
  ON aif_agent_messages(organisation_id,trace_id,created_at);

CREATE TABLE IF NOT EXISTS fin_payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  request_id text NOT NULL,
  intent_hash char(64) NOT NULL CHECK (intent_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key char(64) NOT NULL CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  amount_minor numeric(38,0) NOT NULL CHECK (amount_minor > 0),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  payee_reference text NOT NULL,
  rail text NOT NULL,
  state text NOT NULL DEFAULT 'CREATED'
    CHECK (state IN ('CREATED','VALIDATED','SCREENED','MANDATE_OK','APPROVED')),
  policy_version text NOT NULL,
  decision_id uuid,
  approval_reference text,
  execution_enabled boolean NOT NULL DEFAULT false CHECK (execution_enabled = false),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,request_id),
  UNIQUE (organisation_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS fin_payment_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  payment_intent_id uuid NOT NULL REFERENCES fin_payment_intents(id),
  message_type text NOT NULL,
  payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  dispatch_enabled boolean NOT NULL DEFAULT false CHECK (dispatch_enabled = false),
  dispatch_state text NOT NULL DEFAULT 'held'
    CHECK (dispatch_state IN ('held','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,payment_intent_id,message_type)
);

CREATE TABLE IF NOT EXISTS fin_ledger_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  payment_intent_id uuid REFERENCES fin_payment_intents(id),
  event_type text NOT NULL CHECK (event_type IN ('intent_recorded','proposal_approved','submission_evidence','settlement_evidence','return_evidence','reconciliation_evidence','adjustment_reference')),
  source_reference text,
  evidence_hash char(64) NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  posted_to_ledger boolean NOT NULL DEFAULT false CHECK (posted_to_ledger = false),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_reconciliation_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  payment_intent_id uuid REFERENCES fin_payment_intents(id),
  break_type text NOT NULL CHECK (break_type IN ('timing','amount','missing','duplicate','counterparty','currency','reference_data','confirmation_lag','wrong_chain','address_mismatch','reorg','travel_rule_hold')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','accepted_risk')),
  source_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_match jsonb,
  resolution_reference text,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_fin_recon_breaks_open
  ON fin_reconciliation_breaks(organisation_id,status,created_at);

CREATE TABLE IF NOT EXISTS fin_model_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  model_key text NOT NULL,
  version text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES app_users(id),
  impact_tier text NOT NULL CHECK (impact_tier IN ('tier_1','tier_2','tier_3')),
  intended_use text NOT NULL,
  prohibited_use text NOT NULL,
  model_card jsonb NOT NULL,
  validation_status text NOT NULL DEFAULT 'not_validated'
    CHECK (validation_status IN ('not_validated','in_review','validated_sandbox','rejected','expired')),
  validated_by uuid REFERENCES app_users(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,model_key,version),
  CHECK (validation_status <> 'validated_sandbox' OR (validated_by IS NOT NULL AND validated_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS fin_policy_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  policy_key text NOT NULL,
  version text NOT NULL,
  bundle_hash char(64) NOT NULL CHECK (bundle_hash ~ '^[a-f0-9]{64}$'),
  policy_document jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id,policy_key,version)
);

CREATE TABLE IF NOT EXISTS fin_policy_bundle_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  policy_bundle_id uuid NOT NULL REFERENCES fin_policy_bundles(id),
  approver_user_id uuid NOT NULL REFERENCES app_users(id),
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  rationale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_control_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  control_key text NOT NULL,
  test_period daterange NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('pass','fail','exception','not_tested')),
  evidence_hash char(64) NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  evidence_reference text,
  owner_user_id uuid NOT NULL REFERENCES app_users(id),
  reviewer_user_id uuid REFERENCES app_users(id),
  remediation_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reviewer_user_id IS NULL OR reviewer_user_id <> owner_user_id)
);

CREATE TABLE IF NOT EXISTS fin_dispute_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  provider_case_reference text,
  payment_intent_id uuid REFERENCES fin_payment_intents(id),
  stage text NOT NULL CHECK (stage IN ('inquiry','chargeback_or_return','representment_draft','arbitration','write_off','closed')),
  due_at timestamptz,
  evidence_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash char(64) CHECK (evidence_hash IS NULL OR evidence_hash ~ '^[a-f0-9]{64}$'),
  human_filing_approval uuid REFERENCES app_users(id),
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_provider_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  provider_key text NOT NULL,
  rail_key text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  api_version text,
  specification_reference text,
  specification_hash char(64),
  test_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash char(64) NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'not_certified'
    CHECK (status IN ('not_certified','testing','passed','failed','expired')),
  reviewed_by uuid REFERENCES app_users(id),
  reviewed_at timestamptz,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'passed' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

-- Apply organisation-membership RLS consistently to every new persistence table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aif_agent_registry','aif_agent_messages','fin_payment_intents','fin_payment_outbox',
    'fin_ledger_evidence_events','fin_reconciliation_breaks','fin_model_inventory',
    'fin_policy_bundles','fin_policy_bundle_approvals','fin_control_evidence',
    'fin_dispute_cases','fin_provider_certifications'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (public.sg_has_organisation_membership(organisation_id))',t || '_org_select',t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (public.sg_has_organisation_membership(organisation_id))',t || '_org_insert',t);
  END LOOP;
END $$;

-- Bind user-created rows to the authenticated OIDC actor where a creator column exists.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('aif_agent_registry','created_by'),
    ('fin_payment_intents','created_by'),
    ('fin_ledger_evidence_events','created_by'),
    ('fin_reconciliation_breaks','created_by'),
    ('fin_policy_bundles','created_by'),
    ('fin_dispute_cases','created_by'),
    ('fin_provider_certifications','created_by')
  ) AS v(table_name,actor_column) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I',item.table_name || '_actor',item.table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.sg_aif_validate_actor(%L)',
      item.table_name || '_actor',item.table_name,item.actor_column);
  END LOOP;
END $$;

-- A proposer cannot self-approve a policy bundle.
CREATE OR REPLACE FUNCTION public.sg_fin_guard_policy_approval()
RETURNS trigger LANGUAGE plpgsql AS $fin$
DECLARE creator uuid;
BEGIN
  SELECT created_by INTO creator FROM fin_policy_bundles
   WHERE organisation_id=NEW.organisation_id AND id=NEW.policy_bundle_id;
  IF creator IS NULL OR creator=NEW.approver_user_id THEN
    RAISE EXCEPTION 'policy bundle requires independent approval' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$fin$;
CREATE TRIGGER fin_policy_bundle_approval_guard
  BEFORE INSERT ON fin_policy_bundle_approvals
  FOR EACH ROW EXECUTE FUNCTION public.sg_fin_guard_policy_approval();

-- Append-only evidence and immutable policy/certification records.
CREATE OR REPLACE FUNCTION public.sg_fin_reject_mutation()
RETURNS trigger LANGUAGE plpgsql AS $fin$
BEGIN
  RAISE EXCEPTION 'financial routing evidence is append-only' USING ERRCODE='55000';
END;
$fin$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aif_agent_messages','fin_ledger_evidence_events','fin_policy_bundles',
    'fin_policy_bundle_approvals','fin_control_evidence','fin_provider_certifications'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION public.sg_fin_reject_mutation()',t || '_immutable',t);
  END LOOP;
END $$;

COMMIT;
