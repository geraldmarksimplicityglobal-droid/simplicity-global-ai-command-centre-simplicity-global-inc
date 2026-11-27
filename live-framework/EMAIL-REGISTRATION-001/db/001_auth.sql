BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name varchar(100),
  is_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','active','suspended','disabled')),
  verified_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_verified AND status <> 'pending_verification') OR (NOT is_verified AND status = 'pending_verification'))
);
CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_user_purpose ON auth_action_tokens(user_id,purpose,created_at DESC);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jti uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS auth_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success','failure','pending')),
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_events_created ON auth_audit_events(created_at DESC);

CREATE OR REPLACE FUNCTION sg_prevent_auth_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $
BEGIN RAISE EXCEPTION 'auth_audit_events are append-only'; END;
$;
DROP TRIGGER IF EXISTS auth_audit_events_no_mutation ON auth_audit_events;
CREATE TRIGGER auth_audit_events_no_mutation BEFORE UPDATE OR DELETE ON auth_audit_events
  FOR EACH ROW EXECUTE FUNCTION sg_prevent_auth_audit_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON auth_audit_events FROM PUBLIC;
COMMIT;
