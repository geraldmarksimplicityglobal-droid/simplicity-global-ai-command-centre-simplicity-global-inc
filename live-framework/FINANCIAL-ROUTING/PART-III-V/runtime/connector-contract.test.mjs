import test from "node:test";
import assert from "node:assert/strict";
import {
  intentHash, idempotencyKey, validateDecisionBinding, nextPaymentState,
  classifyRailOutcome, verifyWebhookEnvelope, assertNoExecutionCapability
} from "./connector-contract.mjs";

const intent = { request_id: "req-1", amount_minor: 12500, currency: "ZAR", payee_id: "vendor-1", rail: "INTERNAL_SANDBOX" };
const decision = (overrides = {}) => ({
  decision_id: "dec-1", allow: true, approval_token: "opaque-test-token",
  policy_version: "sandbox-1", intent_hash: intentHash(intent),
  valid_until: "2099-01-01T00:00:00.000Z",
  constraints: { rail_locked: "INTERNAL_SANDBOX", max_amount_minor: 20000 }, ...overrides
});

test("idempotency key is deterministic for the canonical intent", () => {
  assert.equal(idempotencyKey(intent), idempotencyKey({ ...intent, ignored: "not part of contract" }));
});
test("intent rejects non-positive or unsafe minor-unit amount", () => {
  assert.throws(() => intentHash({ ...intent, amount_minor: 0 }), /positive safe integer/);
  assert.throws(() => intentHash({ ...intent, amount_minor: Number.MAX_SAFE_INTEGER + 1 }), /positive safe integer/);
});
test("decision requires active policy version and exact intent binding", () => {
  assert.equal(validateDecisionBinding({ intent, decision: decision(), activePolicyVersion: "sandbox-1" }).allowed, true);
  assert.ok(validateDecisionBinding({ intent, decision: decision(), activePolicyVersion: "sandbox-2" }).errors.includes("policy_version_mismatch"));
  assert.ok(validateDecisionBinding({ intent: { ...intent, amount_minor: 12501 }, decision: decision(), activePolicyVersion: "sandbox-1" }).errors.includes("intent_hash_mismatch"));
});
test("expired, denied and replayed decisions fail closed", () => {
  assert.ok(validateDecisionBinding({ intent, decision: decision({ valid_until: "2000-01-01T00:00:00Z" }), activePolicyVersion: "sandbox-1" }).errors.includes("decision_expired"));
  assert.ok(validateDecisionBinding({ intent, decision: decision({ allow: false }), activePolicyVersion: "sandbox-1" }).errors.includes("policy_denied"));
  assert.ok(validateDecisionBinding({ intent, decision: decision(), activePolicyVersion: "sandbox-1", usedDecisionIds: new Set(["dec-1"]) }).errors.includes("decision_replayed"));
});
test("rail lock and max amount are enforced independently", () => {
  assert.ok(validateDecisionBinding({ intent, decision: decision({ constraints: { rail_locked: "ACH" } }), activePolicyVersion: "sandbox-1" }).errors.includes("rail_lock_mismatch"));
  assert.ok(validateDecisionBinding({ intent, decision: decision({ constraints: { max_amount_minor: 100 } }), activePolicyVersion: "sandbox-1" }).errors.includes("amount_cap_exceeded"));
});
test("UNKNOWN is query-only and never returns a retry instruction", () => {
  assert.deepEqual(nextPaymentState("UNKNOWN", "SENT"), { state: "UNKNOWN", action: "QUERY_ONLY" });
  assert.deepEqual(classifyRailOutcome({ responseReceived: false }), { state: "UNKNOWN", retry: false, action: "QUERY_ONLY" });
});
test("invalid state transitions are rejected", () => {
  assert.throws(() => nextPaymentState("CREATED", "SETTLED"), /invalid payment transition/);
});
test("webhook envelope rejects invalid signature, stale timestamps and duplicate ids", () => {
  const now = Date.parse("2026-11-28T10:00:00Z");
  assert.equal(verifyWebhookEnvelope({ signatureValid: false, timestamp: "2026-11-28T10:00:00Z", now, eventId: "e1" }).accepted, false);
  assert.equal(verifyWebhookEnvelope({ signatureValid: true, timestamp: "2026-11-28T09:00:00Z", now, eventId: "e1" }).reason, "timestamp_outside_replay_window");
  assert.equal(verifyWebhookEnvelope({ signatureValid: true, timestamp: "2026-11-28T10:00:00Z", now, eventId: "e1", seenEventIds: new Set(["e1"]) }).reason, "duplicate_or_missing_event_id");
});
test("proposal-only runtime rejects execution or withdrawal adapters", () => {
  assert.equal(assertNoExecutionCapability({ executionEnabled: false, withdrawalEnabled: false }), true);
  assert.throws(() => assertNoExecutionCapability({ executionEnabled: true }), /proposal-only/);
  assert.throws(() => assertNoExecutionCapability({ withdrawalEnabled: true }), /proposal-only/);
});
