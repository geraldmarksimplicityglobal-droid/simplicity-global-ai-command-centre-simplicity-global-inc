-- S I M P L I C I T Y  G L O B A L
-- PostgreSQL foundation migration — REVIEW DRAFT ONLY
-- Do not run against a live database without approved provider selection,
-- security review, backup, migration plan and explicit deployment approval.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification','active','suspended','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  registered_name text NOT NULL,
  jurisdiction text NOT NULL,
  registration_number text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','in_review','verified','rejected')),
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','suspended','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  role_key text NOT NULL,
  description text,
  UNIQUE (organisation_id, role_key)
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  user_id uuid NOT NULL REFERENCES app_users(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  legal_entity_id uuid REFERENCES legal_entities(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_org_user_role_entity
  ON user_memberships(organisation_id,user_id,role_id,legal_entity_id)
  WHERE legal_entity_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_org_user_role_global
  ON user_memberships(organisation_id,user_id,role_id)
  WHERE legal_entity_id IS NULL;

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  legal_entity_id uuid REFERENCES legal_entities(id),
  name text NOT NULL,
  category text NOT NULL,
  environment text NOT NULL DEFAULT 'unknown',
  lifecycle_status text NOT NULL DEFAULT 'unverified',
  owner_user_id uuid REFERENCES app_users(id),
  evidence_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  document_code text NOT NULL,
  title text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'to_be_assessed',
  version text NOT NULL DEFAULT '1.0-draft',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','legal_review','management_review','approved','published','retired')),
  owner_user_id uuid REFERENCES app_users(id),
  effective_at timestamptz,
  review_due_at timestamptz,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, document_code, version)
);

CREATE TABLE IF NOT EXISTS compliance_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  document_id uuid REFERENCES compliance_documents(id),
  control_code text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'not_assessed'
    CHECK (status IN ('not_assessed','planned','in_progress','implemented','verified','exception')),
  owner_user_id uuid REFERENCES app_users(id),
  evidence_ref text,
  last_verified_at timestamptz,
  UNIQUE (organisation_id, control_code)
);

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  provider text NOT NULL,
  service_name text NOT NULL,
  connection_status text NOT NULL DEFAULT 'not_connected',
  access_mode text NOT NULL DEFAULT 'read_only'
    CHECK (access_mode IN ('read_only','scoped_write','disabled')),
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_verified_at timestamptz,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  requested_by uuid NOT NULL REFERENCES app_users(id),
  title text NOT NULL,
  description text NOT NULL,
  target_system text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','in_review','approved','rejected','execution_pending','executed','verified','rolled_back','cancelled')),
  execution_authorised boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id),
  reviewer_user_id uuid NOT NULL REFERENCES app_users(id),
  decision text NOT NULL CHECK (decision IN ('approve','reject','request_changes')),
  rationale text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  reference_code text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open',
  owner_user_id uuid REFERENCES app_users(id),
  detected_at timestamptz,
  resolved_at timestamptz,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, reference_code)
);

CREATE TABLE IF NOT EXISTS evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  evidence_type text NOT NULL,
  source_system text NOT NULL,
  source_reference text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid REFERENCES app_users(id),
  integrity_sha256 text,
  classification text NOT NULL DEFAULT 'internal',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Append-only audit journal. Application/database roles should receive INSERT
-- and SELECT only; UPDATE and DELETE must be denied by database grants.
CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  actor_user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  outcome text NOT NULL,
  correlation_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  evidence_ref text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_org ON compliance_documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_controls_org ON compliance_controls(organisation_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_org_status ON change_requests(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_org_time ON audit_events(organisation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organisation_id, status);

COMMIT;

-- IMPORTANT IMPLEMENTATION NOTES:
-- 1. This schema alone does NOT enforce tenant isolation or RBAC.
-- 2. Add and test row-level security policies before any application access.
-- 3. Add database grants so the runtime role cannot UPDATE/DELETE audit_events.
-- 4. Add immutable audit triggers / external tamper-evident log shipping.
-- 5. Implement membership/role checks in server-side API middleware.
-- 6. Review the composite membership key if nullable legal_entity_id is used;
--    PostgreSQL uniqueness semantics for NULL require a deliberate design.
-- 7. Add retention, privacy, encryption, backup and restore controls.
-- 8. Run migrations only in disposable local test environments until approved.
