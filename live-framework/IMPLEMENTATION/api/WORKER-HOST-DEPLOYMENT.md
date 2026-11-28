# SG-AUTO-001 Background Worker Host Deployment Runbook

**Status:** Deployment-ready container scaffold; host-specific activation remains pending.
**Safety:** Do not deploy this worker against production data until the host adapter, workload identity, database policy, connector executor, monitoring and release approvals have been independently reviewed.

## Container

Build from `live-framework/IMPLEMENTATION/api`:

```sh
docker build -f Dockerfile.worker -t sg-aif-worker:review .
```

The image runs Node.js 22 as the unprivileged `node` user and starts `npm run worker`. It contains the worker runtime only. It does not contain provider credentials or a trusted host adapter.

## Required deployment-provided configuration

- `SG_WORKER_ADAPTER_MODULE=/app/host/host-adapter.mjs`
- `SG_WORKER_ORGANISATION_ID=<approved organisation UUID>`
- `SG_WORKER_ID=<stable worker identity>`
- Optional bounded tuning: `SG_WORKER_POLL_INTERVAL_MS`, `SG_WORKER_LEASE_SECONDS`, `SG_WORKER_MAX_ATTEMPTS`.

Mount the trusted host adapter read-only at `/app/host/host-adapter.mjs`, outside the repository source tree. Keep its secrets in the host's secret manager or workload identity service; do not place secrets in Docker build arguments, image layers, repository files, command history or logs.

## Required host adapter contract

The deployment-managed module must export:

1. `verifyWorkerIdentity({ organisationId, workerId })`: verify an authenticated workload identity and return an exact matching verified identity.
2. `withTenantClient(organisationId, callback)`: create a transaction under a non-owner, `NOBYPASSRLS` database role, set authenticated tenant/user context, and verify membership. Do not accept a tenant ID from an untrusted task payload as authority.
3. `execute({ organisationId, jobId, requesterId, payload, attempt, signal })`: independently classify the natural-language objective, check requester permissions and exact connector scopes, enforce risk policy, reuse only authorized connectors, and propagate the abort signal to cancellable work. Return only bounded safe summaries and supported status codes.

The adapter must not expose arbitrary SQL, arbitrary shell commands, credential reads, self-granted permissions, or payment execution. Any external write, financial operation, production change or destructive action must remain blocked unless a separate trusted approval workflow authorizes that exact operation. Background queue policy currently accepts only read-only or reversible jobs.

## Runtime controls

- One worker identity is bound to one organisation.
- Use a non-root container user and read-only adapter mount.
- Use the host's workload identity rather than long-lived static database credentials where supported.
- Configure restart-on-failure, CPU/memory limits, log redaction, health/heartbeat monitoring, alerting, cancellation propagation and bounded restart backoff.
- Ensure shutdown drains or safely releases active leases.
- Do not run multiple tenants through one worker until a separately reviewed tenant scheduler exists.
- Apply migrations only after a reviewed backup and explicit environment approval.

## Pre-activation checklist

- [ ] Host/workspace and region explicitly selected.
- [ ] Cost and billing impact approved.
- [ ] Database provisioned and backup/restore tested.
- [ ] Reviewed migrations applied to the intended non-production database.
- [ ] Runtime DB role is non-owner and `NOBYPASSRLS`.
- [ ] OIDC/workload identity configured and exact worker identity verified.
- [ ] Trusted host adapter reviewed and mounted read-only.
- [ ] Connector inventory and consent handoff integrated.
- [ ] Executor independently enforces capabilities, risk and cancellation.
- [ ] Monitoring, alerting, retry/dead-letter and incident runbooks configured.
- [ ] Sandbox end-to-end tests pass.
- [ ] Separate approval obtained before production activation.

No provider, database, worker service or external account is created by this runbook.
