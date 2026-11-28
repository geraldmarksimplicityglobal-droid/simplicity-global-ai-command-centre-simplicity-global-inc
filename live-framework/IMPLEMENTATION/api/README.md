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
- GET/POST /api/aif/jobs (durable queue; read-only/reversible jobs only)
- POST /api/aif/jobs/:id/cancel (requester may cancel their own queued job)
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


## SG-AUTO-001 durable background queue (implementation scaffold)

The `sg-aif-execution-jobs.sql` migration adds a tenant-isolated PostgreSQL queue with idempotency keys, attempt counters, worker leases, lease expiry/reclaim, bounded error codes and cancellation for a requester's own queued jobs.

- `POST /api/aif/jobs` queues a read-only or reversible job under the authenticated user's organisation scope.
- `GET /api/aif/jobs` lists tenant-scoped job state.
- `POST /api/aif/jobs/:id/cancel` cancels only the requester's own queued job.
- The queue rejects high-impact risk classes and unknown fields; caller-supplied approval flags are not accepted.
- `execution-worker.mjs` provides a tenant-bound worker adapter and graceful polling supervisor. The host must supply a trusted `withTenantClient` adapter that establishes authenticated workload identity and organisation membership, plus an `execute` adapter that revalidates connector scopes and policy.
- The worker processes one tenant at a time and does not bypass row-level security. It uses `FOR UPDATE SKIP LOCKED`, expiring leases and worker-fenced completion.
- Only bounded result summaries and machine-readable error codes are persisted. Secrets and raw provider exception details are not stored.

This adds source code and CI coverage only. The migration is applied to ephemeral CI PostgreSQL, not production. No database, worker process, scheduler, OAuth connection, connector or external service is provisioned or activated by this change. Production worker credentials, service-principal membership, deployment supervision, monitoring, alerting, cancellation propagation and operational recovery still require host integration and separate approval.


## Worker host entrypoint

The API package now includes `npm run worker`, which starts `src/worker-main.mjs`. The process requires deployment-provided settings:

- `SG_WORKER_ADAPTER_MODULE`: absolute path to a trusted, deployment-managed ES module outside the repository checkout.
- `SG_WORKER_ORGANISATION_ID`: the single organisation this worker is allowed to service.
- `SG_WORKER_ID`: stable worker identifier.
- Optional bounded tuning: `SG_WORKER_POLL_INTERVAL_MS` (250–60000, default 1500), `SG_WORKER_LEASE_SECONDS` (10–900, default 60), and `SG_WORKER_MAX_ATTEMPTS` (1–20, default 5).

The trusted host adapter must export:
- `verifyWorkerIdentity({ organisationId, workerId })`, returning a verified identity matching both requested values.
- `withTenantClient(organisationId, callback)`, opening a transaction with authenticated workload identity and tenant membership, without RLS bypass.
- `execute({ organisationId, jobId, requesterId, payload, attempt, signal })`, revalidating requester permissions, exact connector capabilities, current scopes, task risk and cancellation before tool invocation.

The worker refuses to start if the adapter or exact workload identity cannot be verified. The adapter is a privileged deployment dependency: keep it outside source control, load its credentials from a secret manager or workload identity, and restrict file access to the worker service account. Run one worker deployment per explicitly configured tenant unless a separately reviewed tenant scheduler is implemented. Use an external supervisor (for example, a container orchestrator or system service) for restart policy, health checks, logs, alerts and graceful termination.

Example environment variable names and values belong in the deployment secret/configuration manager, not in committed files. No real secrets, database URLs, OIDC tokens or provider credentials are included in this repository. This entrypoint does not provision a database, identity provider, adapter module, deployment or worker process. Background processing becomes operational only after those host dependencies are deployed and verified.


### One-command intake and mandatory worker-side classification

The runtime console now accepts only the user's natural-language objective for background submission; it does not ask the user to select a risk class or enumerate connector capabilities. The API stores the request with the queue's least-privilege `read_only` ceiling. This value is a queue restriction, not proof that the natural-language request is safe. Before any tool call, the trusted worker executor must independently interpret the objective, discover the exact required capabilities, verify the requester's current authorization, and classify the actual operation. If the task needs a risk level above `read_only` or `reversible`, the worker must stop without side effects and return an approval/authorization requirement. The worker must not downgrade a task's true risk to fit the queue.


### Blocked background task outcomes

The execution queue now has a terminal `blocked` state for worker-side outcomes `approval_required`, `authorization_required`, `connector_required`, and `policy_denied`. A blocked task releases its worker lease, stores only a bounded safe summary and machine-readable reason code, and is not retried as if it were a transient failure. The worker must not mark a policy-blocked command as succeeded. The requester can inspect the status through the existing jobs endpoint and submit again after the required authorization or connector is resolved.


## Cooperative cancellation of running background jobs

The execution queue supports requester-owned cancellation for both queued and running jobs. Queued jobs transition immediately to `cancelled`. Running jobs receive a durable `cancel_requested_at` marker; the worker observes it on lease heartbeat, aborts the executor signal, and finalizes the job as `cancelled` under the same worker lease. The executor adapter must cooperatively honor the supplied `AbortSignal`; cancellation is not a force-kill and cannot guarantee interruption of an adapter that ignores the signal. A completion update is fenced against a concurrent cancellation request so a cancelled job is not reported as successful. The additive `sg-aif-execution-cancellation.sql` migration adds the marker and its partial index. CI applies this migration only to ephemeral PostgreSQL.
