import test from "node:test";
import assert from "node:assert/strict";
import {
  validateLoopConfig, consumeLoopBudget, assertLoopInterlocks,
  scheduleWithinPriority, clampAdaptation, assertLoopTransition,
  createIdempotentRecoveryPlan, withKeyedLock
} from "../src/self-processing.mjs";

test("loop configuration requires finite iteration and resource ceilings", () => {
  assert.throws(() => validateLoopConfig({ maxIterations: 0 }), /maxIterations/);
  assert.throws(() => validateLoopConfig({ maxIterations: 5, budget: { tokens: -1, usd: 1, seconds: 2 } }), /budget/);
  assert.deepEqual(validateLoopConfig({ maxIterations: 5, budget: { tokens: 1000, usd: 1, seconds: 30 } }).maxIterations, 5);
});

test("budget consumption is bounded and pauses non-P0 work at exhaustion", () => {
  const budget = { tokens: 100, usd: 1, seconds: 10, iterations: 2 };
  assert.deepEqual(consumeLoopBudget(budget, { tokens: 40, usd: 0.25, seconds: 2, iterations: 1 }), {
    tokens: 60, usd: 0.75, seconds: 8, iterations: 1, exhausted: false
  });
  assert.throws(() => consumeLoopBudget(budget, { tokens: 101, usd: 0, seconds: 0, iterations: 0 }), /budget exceeded/);
});

test("every self-processing interlock must pass and failure is fail-closed", () => {
  const good = { killSwitchClear: true, policyReachable: true, policyVersionMatch: true,
    approvalValid: true, approvalSingleUse: true, intentHashMatch: true, screeningClear: true,
    limitsAndAllowlistPass: true, credentialScoped: true, budgetAvailable: true, iterationWithinCap: true };
  assert.equal(assertLoopInterlocks(good), true);
  assert.throws(() => assertLoopInterlocks({ ...good, screeningClear: false }), /screeningClear/);
});

test("scheduler reorders within priority classes but never promotes lower priority", () => {
  const tasks = [
    { id: "later-p0", priority: "P0", deadline: 300 },
    { id: "p2", priority: "P2", deadline: 100 },
    { id: "urgent-p0", priority: "P0", deadline: 100 },
    { id: "p1", priority: "P1", deadline: 50 }
  ];
  assert.deepEqual(scheduleWithinPriority(tasks).map(x => x.id), ["urgent-p0", "later-p0", "p1", "p2"]);
  assert.throws(() => scheduleWithinPriority([{ id: "x", priority: "P2", promoteTo: "P0" }]), /promotion/);
});

test("bounded adaptation clamps to human-approved bounds and rejects invalid bounds", () => {
  assert.equal(clampAdaptation(1.2, { min: 0.8, max: 1.1 }), 1.1);
  assert.equal(clampAdaptation(0.5, { min: 0.8, max: 1.1 }), 0.8);
  assert.throws(() => clampAdaptation(1, { min: 2, max: 1 }), /bounds/);
});

test("loop state machine prevents skipping stages and terminal UNKNOWN cannot resend", () => {
  assert.equal(assertLoopTransition("created", "validated"), true);
  assert.throws(() => assertLoopTransition("created", "executing"), /invalid loop transition/);
  assert.equal(assertLoopTransition("sent", "unknown"), true);
  assert.throws(() => assertLoopTransition("unknown", "sent"), /query-only/);
});

test("recovery plan for UNKNOWN is query-only and never schedules resend", () => {
  assert.deepEqual(createIdempotentRecoveryPlan({ state: "unknown", retryCount: 0, maxRetries: 3 }), {
    action: "query_status", resend: false, reason: "unknown-is-query-only"
  });
  assert.equal(createIdempotentRecoveryPlan({ state: "failed_transient", retryCount: 1, maxRetries: 3 }).action, "retry_same_idempotency_key");
  assert.equal(createIdempotentRecoveryPlan({ state: "failed_transient", retryCount: 3, maxRetries: 3 }).action, "dead_letter");
});

test("keyed lock serializes same resource while allowing different resources concurrently", async () => {
  const order = [];
  await Promise.all([
    withKeyedLock("payee-A", async () => { order.push("A1-start"); await new Promise(r => setTimeout(r, 10)); order.push("A1-end"); }),
    withKeyedLock("payee-A", async () => { order.push("A2"); }),
    withKeyedLock("payee-B", async () => { order.push("B"); })
  ]);
  assert.ok(order.indexOf("A1-end") < order.indexOf("A2"));
  assert.ok(order.indexOf("B") < order.indexOf("A1-end"));
});
