# SG-FIN-ROUTE-001 — Part VI: Self-Processing Loop Engineering

**Status: isolated, offline loop primitives and contract tests. No provider connectivity, payment dispatch, withdrawal, signing or live learning.**

Part VI extends Parts III–V. It formalizes bounded self-processing while preserving human ownership of mandate, policy, approval, credentials, limits and production release.

## Included
- Intent-level concurrency admission with payee serialization, per-rail caps and global in-flight budget.
- Priority-bounded scheduling: P0–P3 ordering, deadline ordering within a class, no cross-class promotion.
- Tiered memory write policy: working/episodic writable; semantic/procedural read-only; ledger/audit append-only.
- Bounded learning proposals with clamping and human review; hard gates, limits, provider/payee and model-version changes cannot be auto-deployed.
- Deterministic stage sequencing and lock-order validation.
- Fail-closed interlock chain, resource budget accounting and iteration/configuration validation.
- Recovery decisions that keep UNKNOWN query-only and prohibit irreversible retries.
- Explicit disabled execution flags and a test suite for the loop invariants.

## Package map
- `runtime/self-processing.mjs`: pure, offline orchestration and governance primitives.
- `runtime/self-processing.test.mjs`: Node built-in tests.
- `self-processing.yaml`: proposed bounded configuration; values are illustrative, not a live mandate.

## Verify
Requires Node.js 20+.

```sh
node --test live-framework/FINANCIAL-ROUTING/PART-III-V/runtime/connector-contract.test.mjs
node --test live-framework/FINANCIAL-ROUTING/PART-VI/runtime/self-processing.test.mjs
```

These tests verify deterministic local logic only. They do not certify a distributed lock service, queue, scheduler, HSM, provider, sandbox or production runtime.

## Safety invariants
1. The executor remains the only role that may ever hold a separately provisioned send credential; this package provisions none.
2. A loop cannot mint approvals, modify limits, write semantic/procedural memory or deploy learned changes.
3. All interlocks must pass. Missing, stale or unavailable policy/approval/credential state fails closed.
4. UNKNOWN is query-only. Never resend until authoritative provider status has been checked and policy explicitly permits a retry.
5. Saga steps require individual authorization. A prior step's approval does not authorize a later leg or compensation.
6. Locks are leases, not long-held network-call mutexes; state must be re-read after lease expiry.
7. Priority class is immutable to the scheduler. P0/P1 protection cannot be displaced by P2/P3 optimization.
8. Financial dispatch, withdrawals and signing remain disabled. No production deployment is performed by this change.

## Production engineering still required
The pure functions are reference logic, not a distributed orchestrator. Before any sandbox integration, implement and independently test durable queues, lease fencing/version checks, per-key serialization, idempotent outbox replay, signed inter-agent envelopes, capability attenuation, circuit breakers, provider-specific cut-off calendars, append-only traces, and chaos/failover tests. Use a trusted policy service and independently enforced connector interlocks. Never hold a distributed lock over an external network call.

## Maturity ceiling
Target SP3 for initial production design, SP4 only after bounded adaptation and human exception handling are proven, and SP5 only after independent red-team, chaos, continuous evaluation and audit evidence. SP6 (self-escalating authority, limits, signing or permissions) is prohibited.
