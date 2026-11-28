# SG-AUTO-001 Approval Verification Hardening — Implementation Plan

> **For agentic workers:** Execute task-by-task with test-first changes. Preserve the existing draft PR and all unrelated branches.

**Goal:** Ensure high-impact autonomous operations execute only after a trusted host-side approval verifier confirms an operation-bound approval.

**Architecture:** Keep the orchestrator framework-neutral. Replace caller-supplied approval objects with an injected trusted verifier adapter; fail closed when the verifier is absent, errors, or returns an invalid attestation. Preserve current connector discovery, foreground/background routing, and default-deny controls.

**Tech Stack:** Node.js 22+, ES modules, built-in node:test.

**Spec:** `live-framework/IMPLEMENTATION/api/AUTONOMY-ORCHESTRATOR.md`

## Global Constraints

- Preserve the existing SG-AIF runtime, database schema, open pull requests and main branch.
- No production deployment, OAuth, connector installation, DNS changes, email sending, account creation or financial execution.
- Read-only and reversible operations retain existing behavior.
- High-impact approvals must be operation-bound, independently approved and verified by a trusted host adapter.
- No caller-controlled JSON field may authorize a high-impact operation.

## Review Focus

- Missing verifier: high-impact operation remains blocked.
- Verifier exception: execution remains blocked.
- Wrong operation/requester or same approver/requester: execution remains blocked.
- Caller-supplied approval-shaped JSON: ignored.
- Valid trusted attestation: operation may proceed through the existing injected executor only.

---

### Task 1: Require trusted approval verification

**Files:**
- Modify: `live-framework/IMPLEMENTATION/api/test/autonomy-orchestrator.test.mjs`
- Modify: `live-framework/IMPLEMENTATION/api/src/autonomy-orchestrator.mjs`
- Modify: `live-framework/IMPLEMENTATION/api/AUTONOMY-ORCHESTRATOR.md`

**Interfaces:**
- `executeAutonomousTask()` accepts a host-only `verifyApproval({ operationId, requesterId, risk })` adapter.
- The adapter returns a verified attestation containing `verified: true`, `approved: true`, matching `operationId`, matching `requesterId`, and a distinct non-empty `approverId`.
- Missing, throwing, or invalid verifiers fail closed.
- `authorizeOperation()` accepts only a verified attestation, never a raw caller approval object.

- [x] Add regression tests for missing verifier, verifier failure, invalid attestation, spoofed caller approval and valid attestation.
- [x] Run the focused test and verify it fails for the expected reason.
- [x] Implement the trusted verifier contract and fail-closed behavior.
- [x] Run focused and full API tests.
- [x] Update documentation to distinguish host verification from user request data.
- [x] Commit the change on the existing isolated PR branch.

## Verification

Run from `live-framework/IMPLEMENTATION/api`:

```sh
node --test test/autonomy-orchestrator.test.mjs
npm test
node --check src/autonomy-orchestrator.mjs
```

Expected: all tests pass, with no test able to authorize a high-impact operation using caller-controlled approval data.


## Execution record

- Regression tests were committed before the implementation change and observed failing in GitHub Actions.
- Root cause found: the task executor still destructured the legacy caller-supplied `approval` property, leaving the trusted `verifyApproval` adapter undefined.
- Corrected the executor contract and updated the existing external-write test to use the host verifier.
- Added a second regression test proving a caller-constructed attestation object cannot authorize the exported policy helper; the test was observed failing before the WeakSet capability check was implemented.
- Final CI verification: GitHub Actions run #169 — 49 tests passed, 0 failed; Node syntax checks passed; PostgreSQL 16 ephemeral migrations and tenant-isolation/append-only audit contract checks passed.
- Final review: self-review (no subagent tool). No critical or important defect found in the bounded library change. Live host integration, persistent worker/queue, connector inventory, consent handoff and production deployment remain out of scope and explicitly unclaimed.
