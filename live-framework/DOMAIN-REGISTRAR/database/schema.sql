-- Proposed schema only. Do not apply to any live database without a reviewed migration and approval.
CREATE TABLE IF NOT EXISTS sg_domains (
  id UUID PRIMARY KEY,
  fqdn TEXT NOT NULL UNIQUE,
  lifecycle_status TEXT NOT NULL DEFAULT 'unverified',
  ownership_verified BOOLEAN NOT NULL DEFAULT FALSE,
  registrar_provider TEXT,
  dns_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sg_domain_approvals (
  id UUID PRIMARY KEY,
  operation TEXT NOT NULL,
  target TEXT NOT NULL,
  approver TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sg_domain_audit_events (
  id UUID PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  outcome TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
