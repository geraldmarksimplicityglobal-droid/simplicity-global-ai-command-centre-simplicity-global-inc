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

- [ ] Add regression tests for missing verifier, verifier failure, invalid attestation, spoofed caller approval and valid attestation.
- [ ] Run the focused test and verify it fails for the expected reason.
- [ ] Implement the trusted verifier contract and fail-closed behavior.
- [ ] Run focused and full API tests.
- [ ] Update documentation to distinguish host verification from user request data.
- [ ] Commit the change on the existing isolated PR branch.

## Verification

Run from `live-framework/IMPLEMENTATION/api`:

```sh
node --test test/autonomy-orchestrator.test.mjs
npm test
node --check src/autonomy-orchestrator.mjs
```

Expected: all tests pass, with no test able to authorize a high-impact operation using caller-controlled approval data.
