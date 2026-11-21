-- SG-LIVE-002 security migration — review and test in disposable database only.
-- Run after schema.postgresql.sql. Never apply to production without approval.
BEGIN;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS identity_issuer text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS identity_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_oidc_identity
  ON app_users(identity_issuer, identity_subject)
  WHERE identity_issuer IS NOT NULL AND identity_subject IS NOT NULL;

-- User context is set from a verified OIDC token by the API for each transaction.
-- Organisation context is set only after a membership lookup.
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_users_self_read ON app_users FOR SELECT
  USING (identity_issuer = current_setting('app.user_issuer', true)
     AND identity_subject = current_setting('app.user_subject', true));

CREATE POLICY memberships_self_read ON user_memberships FOR SELECT
  USING (user_id IN (
    SELECT id FROM app_users
    WHERE identity_issuer = current_setting('app.user_issuer', true)
      AND identity_subject = current_setting('app.user_subject', true)
  ));

CREATE POLICY organisations_member_read ON organisations FOR SELECT
  USING (id IN (SELECT organisation_id FROM user_memberships));

CREATE POLICY legal_entities_org_scope ON legal_entities
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY roles_org_scope ON roles
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY role_permissions_member_read ON role_permissions FOR SELECT
  USING (role_id IN (
    SELECT r.id FROM roles r
    JOIN user_memberships m ON m.organisation_id = r.organisation_id AND m.role_id = r.id
  ));

CREATE POLICY assets_org_scope ON assets
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY compliance_documents_org_scope ON compliance_documents
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY compliance_controls_org_scope ON compliance_controls
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY integrations_org_scope ON integrations
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY change_requests_org_scope ON change_requests
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY incidents_org_scope ON incidents
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY evidence_records_org_scope ON evidence_records
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY audit_events_org_scope ON audit_events
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid);

CREATE POLICY approval_decisions_org_scope ON approval_decisions
  USING (change_request_id IN (
    SELECT id FROM change_requests
    WHERE organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid
  ))
  WITH CHECK (change_request_id IN (
    SELECT id FROM change_requests
    WHERE organisation_id = NULLIF(current_setting('app.organisation_id', true),'')::uuid
  ));

-- Database-level protection: audit rows cannot be altered or removed by ordinary SQL.
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_no_mutation ON audit_events;
CREATE TRIGGER audit_events_no_mutation
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM PUBLIC;

COMMIT;

-- IMPORTANT:
-- * Apply and test with a non-owner runtime role that has NOBYPASSRLS.
-- * Table owners and BYPASSRLS roles can bypass RLS; never run the API as owner.
-- * Provision only narrowly scoped grants to the actual runtime role after role selection.
-- * Review all policies with automated cross-tenant tests before any deployment.
-- * This migration does not provide identity onboarding, retention, encryption-at-rest,
--   key management, backup/restore or full privilege administration.
