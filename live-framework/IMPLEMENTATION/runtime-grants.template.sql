-- S I M P L I C I T Y  G L O B A L
-- Runtime privilege template — REVIEW ONLY; do not run in production as-is.
-- Apply only after provider/database selection, schema review and approval.
-- This creates a non-login group role. A provider-managed login role must be
-- separately created and granted membership in this role by a database admin.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sg_live_framework_runtime') THEN
    CREATE ROLE sg_live_framework_runtime
      NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

-- Confirm the role remains constrained even if it already existed.
ALTER ROLE sg_live_framework_runtime
  NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO sg_live_framework_runtime;

GRANT SELECT ON
  organisations,
  app_users,
  user_memberships,
  roles,
  role_permissions,
  permissions,
  assets,
  compliance_documents,
  change_requests,
  incidents,
  audit_events,
  aif_workflows,
  aif_workflow_events,
  aif_memory_records,
  aif_plugin_registry,
  aif_config_versions,
  aif_config_approvals,
  aif_config_activations,
  financial_route_decisions
TO sg_live_framework_runtime;

GRANT INSERT ON
  assets,
  change_requests,
  audit_events,
  aif_workflows,
  aif_workflow_events,
  aif_memory_records,
  aif_plugin_registry,
  aif_config_versions,
  aif_config_approvals,
  aif_config_activations,
  financial_route_decisions
TO sg_live_framework_runtime;

-- Needed for the GENERATED ALWAYS AS IDENTITY audit event primary key.
GRANT USAGE, SELECT ON SEQUENCE audit_events_id_seq TO sg_live_framework_runtime;

-- Explicitly deny mutation of the audit journal to the application role.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM sg_live_framework_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM PUBLIC;

-- No membership/login role is created here. After a separate provider-specific
-- login role has been approved and created, a database administrator must run:
--   GRANT sg_live_framework_runtime TO <provider_managed_login_role>;
-- Then verify that the login role has no SUPERUSER, BYPASSRLS or ownership rights.
--
-- This template does not grant database CONNECT, create credentials, configure
-- secrets, or provision any database or cloud resource.


-- SG-AIF-001 runtime grants: append-only records are INSERT/SELECT only.
-- Workflow rows are mutable only for the state machine/checkpoint fields used
-- by the API. No DELETE, TRUNCATE, payment execution, or provider-write grants.
GRANT UPDATE (status,current_stage,checkpoint,state_version,last_event_hash,updated_at,closed_at)
  ON aif_workflows TO sg_live_framework_runtime;

REVOKE UPDATE, DELETE, TRUNCATE ON
  aif_workflow_events,aif_config_versions,aif_config_approvals,
  aif_config_activations,financial_route_decisions
FROM sg_live_framework_runtime;
