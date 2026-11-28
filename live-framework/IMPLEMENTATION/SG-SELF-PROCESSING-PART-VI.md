# SG Self-Processing — Part VI

## Scope and autonomy boundary

This layer orchestrates bounded processing loops. It does not create mandate, payment authority, credentials, provider connections, policy changes, or independent deployment rights.

- Maximum maturity: SP5. SP6 self-escalation is prohibited.
- Production autonomy remains at or below L3.3.
- Sandbox autonomy above L3.3 remains simulation-only, capped at L5.4.
- No deployed worker, scheduler, executor, provider adapter, or payment sender is included in this increment.
- The Node module contains deterministic primitives; its keyed lock is process-local and is not a distributed lease service.
- Database lease records are persistence primitives only. A future worker must implement transactional lease acquisition, expiry/reclaim with authoritative state checks, fencing tokens, and per-rail concurrency controls before use.

## Loop and orchestration patterns

Supported design patterns:
1. Single-intent loop: preferred baseline for traceability.
2. Pipeline: queue-separated stages; each stage re-reads authoritative state.
3. Fan-out/fan-in: read-only route/quote evaluation; no parallel send.
4. Saga: each leg is independently authorized; compensation is a new approved action, never a blanket saga approval.

Concurrency:
- Parallelize independent read-only work.
- Serialize writes per intent and resource key.
- Use payee/account/address locks and rail/global in-flight budgets in the future orchestrator.
- Lock ordering: payee, account, rail.
- Never hold a distributed lock while waiting on a provider network call.
- The included `withKeyedLock` is in-process only; it does not protect across replicas.

## Priority and cut-off scheduling

Priority classes are immutable: P0, P1, P2, P3. The scheduler helper orders deadlines within a class and rejects promotion from a lower class to a higher class. A production scheduler must additionally consume versioned cut-off calendars, holidays, liquidity, queue depth, provider health, deadlines and backpressure signals. It must notify on cut-off misses and never silently drop an intent.

## Loop budgets and interlocks

Every loop must have finite:
- maximum iterations;
- token budget;
- USD budget;
- wall-clock budget.

All interlocks are conjunctive and fail closed:
1. Kill switch clear.
2. Policy engine reachable and pinned policy version matches.
3. Approval valid, single-use and intent-hash-bound.
4. Screening clear.
5. Limits, allowlists and asset/chain constraints pass.
6. Connector credential is scoped and valid.
7. Budget remains.
8. Iteration ceiling remains.

No interlock failure may be interpreted as permission to continue.

## State and recovery

The deterministic helper state machine prevents stage skipping. `UNKNOWN` is query-only; no transition to `SENT` is permitted. Transient retry plans reuse the same idempotency key and are capped. Exhausted retries go to a dead-letter/manual path. Pending and unknown states are resolved by authoritative status queries. Irreversible actions require separately authorized compensating actions.

Circuit breakers, connector quarantine, credential quarantine, payee/corridor freezes and global kill switches are deployment requirements, not active services in this PR.

## Memory and bounded learning

- Working memory is ephemeral and scoped to one intent.
- Episodic memory is proposed for later aggregation; it is not self-promoted.
- Semantic and procedural memory are signed, versioned, read-only references.
- Agents may submit memory/adaptation proposals only.
- Semantic/procedural updates, hard gates, limits, thresholds, rails, providers, payees and prompt/model versions require independent human review.
- Adaptation staging requires evaluation evidence and independent approval.
- Drift pauses adaptation; regression requires rollback to a previously approved version.
- Never store secrets or raw payment credentials in memory.

## Multi-agent coordination

Handoffs carry agent identity, trace/correlation ID, intent hash, signed message and short-lived attenuated capability. Each stage re-reads authoritative state. Only a separately provisioned executor identity may eventually hold connector send credentials; this increment provisions none. Auditor and reconciler roles remain read-only. Proposer, approver and executor must be distinct identities.

## Internal orchestrator contract

Request envelope (illustrative; token values must never be logged or placed in model context):

```json
{
  "intent_id": "uuid",
  "stage": "validate|screen|route|approve|execute|verify|reconcile|reflect",
  "correlation_id": "uuid",
  "policy_version": "immutable-version",
  "approval_token_reference": "vault-or-token-service-reference",
  "budget": {"tokens_left": 12000, "usd_left": 1.2, "seconds_left": 30, "iterations_left": 3},
  "state_reference": "opaque-state-reference",
  "constraints": {"max_amount_minor": "2500000", "rail_locked": "approved-rail", "expires_at": "RFC3339"}
}
```

Response:
```json
{"status":"accepted|held|blocked|completed|unknown|escalate","reference_id":null,"break_reference":null,"action":"query_status|manual_review|none","escalate":false}
```

Responses are evidence-logged. No stage returns secrets. The envelope is a contract proposal, not an exposed API endpoint.

## Provider-specific loop stops

| Provider class | Loop variation | Mandatory stop |
|---|---|---|
| SA banks | File/API batch, response-file/status polling | Cut-off miss or unverified beneficiary |
| Equal | Collection and return-code loop | Invalid/revoked mandate |
| Crypto exchanges | Trade loop separated from withdrawal loop | Chain mismatch, new address or pending withdrawal |
| Self-custody wallets | Prepare unsigned transaction only | Stop before signature or broadcast |
| MoonPay | Quote/KYC/on-ramp; separately gated off-ramp | Quote expiry or KYC/compliance hold |
| PayPal/Wise | Pay/payout and dispute loops | Account limitation or compliance hold |
| FX | Quote/execute inside guardband | Stale quote or slippage breach |
| Instant rails | Capped, pre-screened send loop | New payee or high-value irreversible payment |

These are architecture profiles only; provider-specific APIs and capabilities must be verified against current official documentation and contracts before implementation.

## Incident playbooks

### P1 — Runaway loop or duplicate-send suspicion
Activate global kill switch, quarantine connector, preserve traces and idempotency evidence, query rail status, identify duplicates, use approved recall/return processes, fix iteration/budget/state defects, and recertify before re-enable.

### P1 — Injection-driven payee/address mutation
Block the mutation, freeze the affected payee/address, preserve source document provenance, require out-of-band verification, quarantine poisoned source material, and add regression fixtures.

### P1 — Policy engine unavailable
Verify no send occurred; keep intents held, restore and pin the approved policy version, replay only through policy evaluation and idempotent state checks.

### P2 — Approval backlog
Protect P0/P1, defer P2/P3, alert named approvers, escalate before deadlines, and review capacity and approval-quality signals.

### P2 — Reconciliation break spike
Pause automatic break resolution, preserve source reports, route to manual triage, investigate provider/feed/state divergence, and resume only after control checks.

### P3 — Adaptation regression
Rollback to prior approved values, pause adaptation, compare champion/shadow evidence and revalidate before re-entry.

## Forensics and observability

Record redacted stage inputs, decision factors, policy and memory versions, timestamps, trace ID, approval-token hash (never token), state transitions, execution reference if supplied by a future approved connector, status history, reconciliation result and adaptation proposals. Events are append-only and hash-addressed. Forensic reads are read-only and audited.

Monitor queue depth, per-stage latency, p50/p95/p99, iteration counts, budget consumption, retry rates, UNKNOWN age, connector health, priority-class SLA, reconciliation breaks, approval latency, override rate, adaptation drift and kill-switch state. Alert thresholds and retention are jurisdiction- and mandate-specific and must be approved, not inferred.

## Performance targets and tuning

Design target only: policy decision plus authorization under 500 ms p95, excluding provider network latency; send latency is provider-bound and reconciliation is asynchronous. Cache signed static reference tables, pin policy versions per intent, parallelize read-only screening, serialize writes, batch reconciliation, use pooled connections, respect provider rate limits, and use exponential backoff with jitter. Targets require measured load testing before adoption as SLOs.

## Test gates

- 100% hard-gate compliance; a single bypass fails certification.
- Zero unapproved sends in shadow/canary.
- UNKNOWN never resends.
- Duplicate and out-of-order events converge to one authoritative state.
- Kill switch mid-loop halts new sends and safely resolves in-flight state.
- Poisoned memory versions and prompt injection are rejected.
- Approval replay and post-approval intent tampering are rejected.
- Keyed serialization and distributed lease/fencing behavior are tested under multi-process chaos.
- Reconciliation, rollback and recovery drills pass before any live cutover.

## Maturity

SP0 manual; SP1 single tool call with human check; SP2 multi-step human-approved writes; SP3 bounded policy/audit loops; SP4 supervised exception handling with bounded adaptation; SP5 governed multi-agent self-healing with red-team and continuous evaluation. SP6 self-escalating limits, permissions or signing is prohibited.
