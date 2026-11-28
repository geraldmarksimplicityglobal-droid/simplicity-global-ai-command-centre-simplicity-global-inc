-- SG-LIVE-002 security migration — review and test in disposable database only.
-- Run after schema.postgresql.sql. Never apply to production without approval.
BEGIN;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS identity_issuer text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS identity_subject text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_oidc_identity
  ON app_users(identity_issuer, identity_subject)
  WHERE identity_issuer IS NOT NULL AND identity_subject IS NOT NULL;

-- Verified OIDC identity context is set by the trusted API per transaction.
-- Membership is independently checked by RLS as defence against scope mistakes.
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

-- SECURITY INVOKER is intentional: membership reads remain subject to RLS.
-- Custom GUC values are application context, not a cryptographic identity proof;
-- the API must remain the trusted boundary and must use parameterised SQL.
CREATE OR REPLACE FUNCTION public.sg_has_organisation_membership(target_org uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_memberships m
    JOIN public.app_users u ON u.id = m.user_id
    WHERE m.organisation_id = target_org
      AND target_org = NULLIF(current_setting('app.organisation_id', true), '')::uuid
      AND u.identity_issuer = current_setting('app.user_issuer', true)
      AND u.identity_subject = current_setting('app.user_subject', true)
  );
$$;

CREATE OR REPLACE FUNCTION public.sg_has_asset_scope(target_org uuid, target_entity uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_memberships m
    JOIN public.app_users u ON u.id = m.user_id
    WHERE m.organisation_id = target_org
      AND u.identity_issuer = current_setting('app.user_issuer', true)
      AND u.identity_subject = current_setting('app.user_subject', true)
      AND CASE
        WHEN current_setting('app.legal_entity_id', true) = '*' THEN m.legal_entity_id IS NULL
        ELSE m.legal_entity_id IS NULL
          OR m.legal_entity_id = NULLIF(current_setting('app.legal_entity_id', true),'')::uuid
      END
      AND CASE
        WHEN target_entity IS NULL THEN m.legal_entity_id IS NULL
        WHEN current_setting('app.legal_entity_id', true) = '*' THEN TRUE
        ELSE target_entity = NULLIF(current_setting('app.legal_entity_id', true),'')::uuid
      END
  );
$$;

INSERT INTO permissions(permission_key,description) VALUES
  ('assets:read','Read asset inventory'),
  ('assets:write','Create asset records'),
  ('compliance:read','Read compliance documents and controls'),
  ('changes:read','Read change requests'),
  ('changes:request','Submit change requests'),
  ('incidents:read','Read incident records'),
  ('audit:read','Read audit events')
ON CONFLICT (permission_key) DO NOTHING;

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
  USING (public.sg_has_organisation_membership(id));

CREATE POLICY legal_entities_org_scope ON legal_entities
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY roles_member_read ON roles FOR SELECT
  USING (id IN (SELECT role_id FROM user_memberships));

CREATE POLICY roles_org_scope ON roles
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY role_permissions_member_read ON role_permissions FOR SELECT
  USING (role_id IN (
    SELECT r.id FROM roles r
    JOIN user_memberships m ON m.organisation_id = r.organisation_id AND m.role_id = r.id
  ));

CREATE POLICY assets_org_entity_scope ON assets
  USING (public.sg_has_asset_scope(organisation_id, legal_entity_id))
  WITH CHECK (public.sg_has_asset_scope(organisation_id, legal_entity_id));

CREATE POLICY compliance_documents_org_scope ON compliance_documents
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY compliance_controls_org_scope ON compliance_controls
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY integrations_org_scope ON integrations
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY change_requests_org_scope ON change_requests
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY incidents_org_scope ON incidents
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY evidence_records_org_scope ON evidence_records
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY audit_events_org_scope ON audit_events
  USING (public.sg_has_organisation_membership(organisation_id))
  WITH CHECK (public.sg_has_organisation_membership(organisation_id));

CREATE POLICY approval_decisions_org_scope ON approval_decisions
  USING (change_request_id IN (
    SELECT id FROM change_requests
    WHERE public.sg_has_organisation_membership(organisation_id)
  ))
  WITH CHECK (change_request_id IN (
    SELECT id FROM change_requests
    WHERE public.sg_has_organisation_membership(organisation_id)
  ));

-- Audit journal is append-only for application roles.
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
-- * Custom PostgreSQL settings can be set by a connected role. These policies
--   provide membership-aware defence-in-depth, not isolation from arbitrary SQL
--   execution under the runtime credential. Keep parameterised queries, prohibit
--   untrusted SQL, and consider stronger DB identity binding for higher assurance.
-- * Provision only narrowly scoped grants to the actual runtime role after role selection.
-- * This migration does not provide identity onboarding, retention, encryption-at-rest,
--   key management, backup/restore or full privilege administration.
