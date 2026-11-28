# SG-LIVE-002 — API service foundation

**Status:** Source scaffold only. Not deployed, not connected to a database, and not authorised for production.
**Runtime:** Node.js 22+, Fastify, PostgreSQL, OIDC JWT verification.

## Implemented in this scaffold
- OIDC bearer-token verification against configured issuer, explicit JWKS URL and audience.
- Server-side user provisioning lookup; unknown identities are denied.
- Organisation membership and permission checks before domain access.
- Explicit legal-entity scope for asset routes; entity-only memberships cannot silently expand to organisation-wide access.
- Organisation context set inside each transaction for database RLS.
- Health, identity, assets, compliance documents, change requests, incidents and audit read endpoints.
- Asset and change-request creation endpoints with validation and audit events.
- Security headers, explicit CORS allowlist and rate limiting.
- No infrastructure provisioning, external write connector, deployment or billing operation.
- Persistent SG-AIF-001 workflow, checkpoint, event-chain, governed memory, plugin inventory and versioned configuration APIs.
- SG-FIN-ROUTE-001 route proposal storage; current policy always blocks execution because no approved mandate or live kill-switch release is configured.

## Required before running
1. Select and configure a supported OIDC identity provider.
2. Provision a dedicated PostgreSQL instance only after approved provider, region, cost and data-processing review.
3. Apply the reviewed base schema, then the security/RLS migration.
4. Review `runtime-grants.template.sql`; create a non-owner runtime login and grant membership in the restricted `sg_live_framework_runtime` group. Verify NOBYPASSRLS and least-privilege grants.
5. Configure secrets in a secret manager. Never commit real environment files.
6. Provision users, memberships, roles and permission mappings through a separately controlled administrative process.
7. Configure the exact production frontend origin in CORS.
8. Run tests, dependency scanning, security review and restore tests.

## Local development
Use test-only values in a local ignored environment file. Do not point this scaffold at production data.

## API
- GET /health — liveness only; does not assert database or identity readiness.
- GET /api/me — authenticated user and memberships.
- GET/POST /api/assets
- GET /api/compliance/documents
- GET/POST /api/change-requests
- GET /api/incidents
- GET /api/audit-events
- GET /api/aif/runtime
- GET/POST /api/aif/workflows
- GET /api/aif/workflows/:id
- POST /api/aif/workflows/:id/events
- POST /api/aif/workflows/:id/checkpoints
- GET/POST /api/aif/memory
- GET/POST /api/aif/plugins (discovery/registration only; no install or OAuth)
- GET/POST /api/aif/configurations
- POST /api/aif/configurations/:id/approve
- POST /api/aif/configurations/:id/activate
- GET/POST /api/financial-routing/decisions (prepare only; never execute)

Every scoped request requires a valid UUID in x-organisation-id. Asset routes optionally accept x-legal-entity-id; entity-only memberships must match that entity, while organisation-wide access requires an organisation-wide membership. Other domains remain organisation-scoped until their records support legal-entity isolation. Authorization is enforced server-side. An approval record is never an execution command.

## Known limitations
- No UI integration yet.
- No identity-provider admin onboarding flow.
- No evidence file upload/object storage.
- No connector adapters or write actions.
- No update/delete endpoints; additions only for initial safe operations.
- Audit immutability depends on the separate database security migration, runtime grants and owner separation.
- Asset endpoints support optional legal-entity scoping; other domain tables remain organisation-scoped until entity ownership is added to their schema.
- Production use is blocked until all release gates are evidenced and explicitly approved.


## SG-AIF-001 persistence and runtime controls

The separate `sg-aif-persistence.sql` migration adds organisation-scoped PostgreSQL persistence for workflows, hash-chained workflow events, expiring memory records, plugin discovery inventory, immutable configuration versions, independent approvals/activation records and financial route decisions.

- The migration is applied only to the ephemeral PostgreSQL CI service by the workflow.
- `runtime-grants.template.sql` grants the runtime role SELECT/INSERT, with narrow column-level UPDATE on workflow state/checkpoint fields only.
- Workflow events, configuration versions, approvals, activations and financial route decisions are append-only.
- Row-level security is enabled on all new tenant-scoped tables.
- AIF permissions are added to the permission catalogue but are **not automatically assigned** to any user or role.
- Production autonomy is capped at L3.3; sandbox L5.4 requires explicit simulation-only mode.
- Persistent memory rejects credential/secret-bearing field names, limits records to 64 KB and requires expiry between 1 and 365 days.
- Financial route proposals are persisted as blocked by default. The database enforces `execution_allowed = false` and `selected_route IS NULL`. There is no payment execution endpoint.
- Configuration is versioned; draft creation does not activate it. A different authorised identity must approve it before a separate activation action.
- Expired memory is hidden from API reads. Physical erasure/retention cleanup remains an administrator-controlled retention job and is not yet automated.

## Runtime activation prerequisites

The implementation is committed to a feature branch, not deployed. Before any persistent service is activated, select and approve a PostgreSQL provider/region, provision a non-production database, apply reviewed migrations using an administrator role, create a non-owner NOBYPASSRLS runtime login, configure the OIDC issuer/JWKS/audience and secret manager, assign permissions through a separate identity-admin process, and test backup/restore. No production database has been created or modified by this change.
