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
