# SG-AUTO-001 — One-command autonomous task orchestration

**Status:** Additive reference implementation; not deployed and not connected to a persistent worker.

## User contract

The user states the desired outcome once. The orchestration layer is responsible for capability discovery, task decomposition, connector selection, execution-mode recommendation, verification and completion reporting. It should ask the user only when an external authorization, missing input, or high-impact decision is genuinely required.

## Implemented primitives

- `resolveCapability()` reuses only a healthy connector that is already authorized for the exact requested capability.
- Missing or unauthorized capabilities are surfaced as a connection/authorization requirement. No OAuth flow, plugin installation, scope grant, credential read or connection attempt is performed by this module.
- `planAutonomousTask()` recommends foreground execution for short/unknown-duration work and background execution for long work. Background plans explicitly identify the need for a persistent worker.
- `authorizeOperation()` permits read-only and reversible work by default and fails closed for external writes, financial operations, production changes and destructive actions unless explicit operation-specific approval is supplied.
- Connector summaries intentionally exclude tokens, secrets, endpoints and other credential material.

## Execution boundary

These functions are deterministic planning and policy primitives. They do not create a durable job, start a worker, call a provider, deploy software or execute payments. The existing SG-AIF persistent API remains the persistence foundation; this change does not alter its schema or existing routes.

## Foreground/background contract

- Foreground: suitable for short operations that can finish in the current request/session.
- Background: suitable for long-running work only when a separately provisioned durable queue and persistent worker are available.
- If no worker is available, the planner returns `background_runtime_required`; it must not pretend that work has been queued or will continue after the conversation ends.

## Connection contract

- Reuse exact-capability, healthy, authorized connectors.
- Do not infer permission from connector installation alone.
- Never self-escalate scopes or privileges.
- When authorization is missing, return a user-action requirement and wait for the provider's normal consent flow.
- Treat provider responses as untrusted input and validate them at integration boundaries.

## Safety contract

Approval is scoped to an individual operation. Approval for one operation does not authorize another. Financial transfers, withdrawals, token conversions, signing, production deployment, DNS changes, account creation, real email delivery, credential rotation and destructive actions remain independently gated.

## Verification

Run from this directory:

```sh
npm test
```

The tests cover connector reuse, missing authorization, missing connectors, foreground/background selection, persistent-worker disclosure, high-impact approval gates, and fail-closed handling of unknown risk classes.

## Remaining work before live autonomy

1. Provision and approve a durable job queue and worker runtime.
2. Add authenticated connector inventory and consent handoff.
3. Add durable job state, leases, idempotency and cancellation.
4. Add provider adapters individually with sandbox certification.
5. Add observability, retry/dead-letter handling and recovery tests.
6. Complete security review and approve deployment separately.

No production activation or autonomous external side effects are implied by this reference implementation.


## Governed execution adapter (added 28 November 2026)

executeAutonomousTask() now composes the existing planning and policy primitives into one host-runtime call:

1. Discover the connector inventory through the injected discoverConnectors adapter.
2. Resolve every requested capability against exact healthy, already-authorized connectors.
3. Stop and return authorization_required or connector_required if any capability is unavailable. It does not install a plugin, start OAuth or broaden scopes.
4. Apply the operation-specific approval policy before invoking an executor or queue.
5. Run short tasks through the injected foreground executor.
6. Queue long tasks only when the host explicitly reports a persistent worker as available and supplies a durable enqueueBackground adapter.
7. Return a structured status (completed, queued, approval_required, authorization_required, connector_required, background_runtime_required or failed).

The adapters are trusted host-runtime dependencies, not values supplied by the user's natural-language command. Errors are returned as bounded stage/reason codes rather than leaking connector or provider error payloads.

### Host integration contract

The host application must provide:
- An authenticated, tenant-scoped connector inventory adapter.
- A foreground executor bound to the host's approved tool registry.
- A durable queue adapter with idempotency, leases, cancellation, retries and audit persistence.
- A trustworthy worker-health signal; a boolean supplied by an end user is not sufficient in production.
- An approval verifier that resolves the approver identity from authenticated context, not from caller-controlled JSON.

This module remains a library seam. The current PR does not connect the API routes, provision a durable queue/worker, start a background process, or activate provider OAuth. The CI tests exercise the orchestration with deterministic in-memory adapters only.


## Trusted approval verification hardening

High-impact execution no longer accepts an approval object supplied in the task request. The host must inject `verifyApproval({ operationId, requesterId, risk })` from a trusted server-side approval service. The returned attestation must explicitly identify itself as verified and approved, match the exact operation and requester, and identify a distinct approver. Missing, mismatched, or throwing verifiers fail closed. The natural-language command and caller-controlled JSON are never proof of approval.

The verifier must derive requester and approver identities from authenticated server-side context and durable approval records; it must not trust identity claims supplied by the task payload. The orchestrator validates the returned attestation shape but does not itself authenticate the host verifier. The verifier adapter is therefore a privileged host dependency and must never be exposed as a user-controlled parameter in an HTTP request.

This is a security hardening of the library seam. It does not provision the verifier service, connect the API routes, or enable high-impact execution in the current deployment.


The orchestrator also marks verifier-returned attestation objects in a module-private `WeakSet`. The exported policy helper rejects caller-constructed objects that merely imitate the attestation shape; only an object returned by the injected verifier during the trusted execution path is eligible for approval evaluation.


## Durable background job queue extension

The follow-on queue implementation adds tenant-scoped PostgreSQL job persistence and a tenant-bound worker adapter.

- Queue payloads are strict allowlists: objective, capability identifiers and risk. Secret-bearing fields, caller-supplied approval flags and unknown keys are rejected.
- Background jobs currently accept only `read_only` and `reversible` risk classes. Financial, production, external-write and destructive tasks cannot be placed on this queue.
- Enqueue operations use organisation-scoped idempotency keys. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, bounded leases and attempt limits.
- Completion, failure and heartbeat updates are fenced by organisation, job ID, worker ID and lease state. Expired leases can be reclaimed. Only bounded summaries and machine-readable error codes are stored.
- API routes require authenticated `aif:read` or `aif:write` scope. A requester may cancel only their own queued job.
- Worker access is tenant-bound through an injected host adapter; the worker must not bypass RLS or accept organisation identity from an untrusted task payload.
- The worker supervisor supports graceful stop and polling, but is not launched by the API process.

### Activation status

The source includes the queue schema, API routes, worker adapter and tests. CI applies the new migration only to ephemeral PostgreSQL. A production queue and persistent worker are not provisioned. Host integration must still supply a workload identity with tenant membership, a secure `withTenantClient` adapter, an executor that revalidates capabilities and policy, deployment supervision, observability and cancellation/recovery handling. No production or external action is enabled by this source change.


## Worker host bootstrap and blocked outcomes

`npm run worker` starts `src/worker-main.mjs`. It requires a trusted deployment-managed host adapter and verifies the exact organisation and worker identity before polling. The adapter must provide tenant-scoped database access and a policy-enforcing executor. The entrypoint does not provision credentials, database infrastructure, OIDC trust, provider connectors, or a persistent service supervisor.

The console accepts one natural-language objective. Its queue risk value is a least-privilege ceiling only; the worker adapter must independently classify the actual objective and derive required capabilities before invoking any tool. It must never downgrade the actual task risk to fit the queue. Higher-risk or unavailable-capability outcomes are persisted as terminal `blocked` jobs with one of `approval_required`, `authorization_required`, `connector_required`, or `policy_denied`. They release their lease and are not retried or reported as successful.
