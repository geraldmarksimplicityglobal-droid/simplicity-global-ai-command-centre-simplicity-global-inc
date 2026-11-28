import test from "node:test";
import assert from "node:assert/strict";
import {
  validateLoopConfig, orderWithinPriority, admitIntent, checkInterlocks,
  decideRecovery, debitBudget, canWriteMemoryTier, boundLearningProposal,
  validateStageTransition, validateLockOrder, summarizeLoopOutcome
} from "./self-processing.mjs";

const config = {
  max_iterations: 5,
  budget: { tokens: 12000, usd: 1.2, seconds: 30 },
  concurrency: { per_payee_lock: true, per_rail_cap: 2, in_flight_max: 4 },
  recovery: { retry_transient: 3, irreversible_retry: 0, unknown_policy: "query_only", quarantine_threshold: 3 }
};

test("loop config requires finite positive iteration and resource caps", () => {
  assert.equal(validateLoopConfig(config).valid, true);
  assert.equal(validateLoopConfig({ ...config, max_iterations: 0 }).valid, false);
  assert.equal(validateLoopConfig({ ...config, budget: { ...config.budget, usd: -1 } }).valid, false);
});
test("scheduler sorts only within priority class and never promotes P2 over P0", () => {
  const items = [
    { id: "p2-fast", priority: "P2", deadline: "2026-12-01T10:00:00Z" },
    { id: "p0-late", priority: "P0", deadline: "2026-12-01T11:00:00Z" },
    { id: "p0-early", priority: "P0", deadline: "2026-12-01T09:00:00Z" }
  ];
  assert.deepEqual(orderWithinPriority(items).map(x => x.id), ["p0-early", "p0-late", "p2-fast"]);
});
test("scheduler rejects unknown priority classes", () => {
  assert.throws(() => orderWithinPriority([{ id: "x", priority: "P9" }]), /priority/);
});
test("admission enforces payee serialization, rail cap and global in-flight budget", () => {
  const active = [{ payee_id: "p1", rail: "R1" }, { payee_id: "p2", rail: "R1" }];
  assert.equal(admitIntent({ payee_id: "p1", rail: "R2" }, active, config).allowed, false);
  assert.equal(admitIntent({ payee_id: "p3", rail: "R2" }, active, config).allowed, true);
  assert.equal(admitIntent({ payee_id: "p3", rail: "R2" }, [...active, {}, {}, {}], config).allowed, false);
});
test("interlock chain fails closed and reports every failed gate", () => {
  const pass = Object.fromEntries(["kill_switch_clear","policy_available","policy_version_match","approval_valid","screening_clear","limits_allowlists_chain_pass","credential_valid","budget_available","iteration_within_cap"].map(k=>[k,true]));
  assert.equal(checkInterlocks(pass).allowed, true);
  const failed = checkInterlocks({ ...pass, policy_available: false, approval_valid: false });
  assert.equal(failed.allowed, false);
  assert.deepEqual(failed.failed, ["policy_available","approval_valid"]);
});
test("UNKNOWN and irreversible outcomes never retry", () => {
  assert.deepEqual(decideRecovery({ state: "UNKNOWN", errorClass: "timeout", attempt: 1, config }), { action: "QUERY_ONLY", retry: false });
  assert.equal(decideRecovery({ state: "FAILED", errorClass: "transient", attempt: 1, config, irreversible: true }).retry, false);
  assert.equal(decideRecovery({ state: "FAILED", errorClass: "transient", attempt: 1, config }).retry, true);
  assert.equal(decideRecovery({ state: "FAILED", errorClass: "transient", attempt: 4, config }).retry, false);
});
test("budget debit rejects negative and over-budget consumption", () => {
  assert.deepEqual(debitBudget({ tokens: 10, usd: 1, seconds: 5 }, { tokens: 3, usd: 0.2, seconds: 1 }), { allowed: true, remaining: { tokens: 7, usd: 0.8, seconds: 4 } });
  assert.equal(debitBudget({ tokens: 1, usd: 1, seconds: 1 }, { tokens: 2, usd: 0, seconds: 0 }).allowed, false);
});
test("agent may write working and episodic memory only", () => {
  assert.equal(canWriteMemoryTier("working"), true);
  assert.equal(canWriteMemoryTier("episodic"), true);
  assert.equal(canWriteMemoryTier("semantic"), false);
  assert.equal(canWriteMemoryTier("procedural"), false);
  assert.equal(canWriteMemoryTier("ledger"), false);
});
test("learning proposals are clamped and never auto-deployed", () => {
  const result = boundLearningProposal({ key: "routing_weight", proposed: 1.4, min: 0.2, max: 1.0 });
  assert.deepEqual(result, { accepted_for_review: true, value: 1, auto_deploy: false, clamped: true, key: "routing_weight" });
  assert.equal(boundLearningProposal({ key: "hard_gate", proposed: false, min: 0, max: 1, category: "hard_gate" }).accepted_for_review, false);
});
test("loop stages cannot be skipped or run out of order", () => {
  assert.equal(validateStageTransition("intake", "classification").allowed, true);
  assert.equal(validateStageTransition("intake", "executor").allowed, false);
});
test("lock ordering follows payee, account, rail", () => {
  assert.equal(validateLockOrder(["payee", "account", "rail"]).valid, true);
  assert.equal(validateLockOrder(["rail", "payee"]).valid, false);
});
test("loop outcome escalates interlock failures and preserves query-only unknown", () => {
  assert.equal(summarizeLoopOutcome({ interlocksPassed: false, state: "CREATED" }).status, "HALTED_ESCALATE");
  assert.equal(summarizeLoopOutcome({ interlocksPassed: true, state: "UNKNOWN" }).action, "QUERY_ONLY");
});
