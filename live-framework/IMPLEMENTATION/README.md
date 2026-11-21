# S I M P L I C I T Y  G L O B A L — Backend foundation

**Status:** Architecture and migration draft; not connected to a live database.
**Target:** PostgreSQL-compatible relational backend. Provider selection remains open.
**Security posture:** Deny by default; least privilege; tenant/entity scoping; append-only audit events; explicit approval gates.

## Scope

This foundation supports the existing framework prototype without replacing its UI or changing the repository's default branch:

- Organisations and legal entities
- Users, roles and permissions
- Asset inventory
- Compliance documents and control records
- Integration/connector inventory
- Change requests and approval decisions
- Incident records
- Evidence references
- Append-only audit events

## Required service boundaries

1. **Identity adapter:** OIDC/OAuth provider integration; never store provider passwords.
2. **Authorisation service:** server-side RBAC and organisation/entity scope checks on every request.
3. **Domain API:** validated CRUD for inventory and registers; no direct browser-to-database access.
4. **Approval service:** state machine for proposed, approved, rejected, executed and verified changes. Approval is not execution.
5. **Audit service:** append-only event writes with actor, action, target, timestamp, correlation ID and evidence reference.
6. **Evidence service:** metadata and controlled object-storage references; do not place secrets or sensitive personal data in audit payloads.
7. **Connector adapters:** individually scoped, read-only by default; write capabilities separately gated.

## Non-negotiable production controls

- Enforce authentication and authorisation on the server, not only in the UI.
- Use database migrations reviewed in pull requests.
- Apply row-level/entity-level access controls and test cross-tenant isolation.
- Keep credentials in the selected hosting provider's secret manager; never commit secrets.
- Use TLS, encrypted backups, key rotation and tested restore procedures.
- Rate-limit authentication and sensitive endpoints.
- Validate and encode all input/output; protect against CSRF where cookie sessions are used.
- Maintain retention schedules and data-subject request workflows.
- Separate development, staging and production environments.
- Require two-person review for high-risk production changes where practicable.
- No automatic infrastructure provisioning, spending, deployment, deletion or external publication from an approval record.

## Suggested API surface

- `GET/POST /api/assets`
- `GET/POST /api/compliance/documents`
- `GET/POST /api/compliance/controls`
- `GET/POST /api/integrations`
- `GET/POST /api/change-requests`
- `POST /api/change-requests/{id}/decisions`
- `GET/POST /api/incidents`
- `GET /api/audit-events`
- `POST /api/evidence`

All writes require authenticated actor identity, server-side permission checks, schema validation and audit logging. Approval decisions must be distinct from execution endpoints.

## Build sequence

1. Select hosting/database provider and identity provider after account inspection.
2. Implement migrations and local test database.
3. Implement authentication and RBAC.
4. Implement domain APIs and audit service.
5. Add integration adapters in read-only mode.
6. Add automated unit, integration, security and tenant-isolation tests.
7. Deploy to isolated staging only after explicit approval.
8. Verify backups, restore, monitoring and incident response.
9. Production release requires separate explicit approval.

## Verification completed in CI

- Node syntax and API contract tests pass in GitHub Actions.
- PostgreSQL 16 ephemeral CI migration test applies the schema, RLS migration and runtime-grants template.
- Database contract checks verify OIDC user visibility, entity-only isolation, organisation-wide access, cross-organisation denial and append-only audit protection.
- Latest verified run: GitHub Actions run #31 — succeeded. This is disposable CI evidence only, not a live database deployment or independent security certification.

## Known gaps

The current `index.html` is a browser-local prototype using localStorage and seeded demo data. It is not multi-user, does not have a server-side identity boundary, and is not a source of verified live telemetry. The API and SQL remain source scaffolding; no live PostgreSQL database or identity provider is connected. The RLS context values are supplied by the trusted API and are not a cryptographic defense against arbitrary SQL execution using the runtime credential. This document does not claim those capabilities are implemented.
