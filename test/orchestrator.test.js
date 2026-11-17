import test from "node:test";
import assert from "node:assert/strict";
import { studioTasks, validateRegistry } from "../src/registry.js";
import { DEFAULT_POLICY, mayExecute, validatePolicy } from "../src/policy.js";
import { buildTaskStates, createPlan, getReadyTasks, planConcurrency } from "../src/scheduler.js";

test("initial registry contains ten unique, acyclic workstreams", () => {
  assert.equal(studioTasks.length, 10);
  assert.equal(validateRegistry(), true);
});

test("default policy is read-only and denies execution capabilities", () => {
  assert.equal(validatePolicy(), true);
  assert.equal(DEFAULT_POLICY.allowWorkerLaunch, false);
  assert.equal(DEFAULT_POLICY.allowFilesystemWrites, false);
  assert.equal(DEFAULT_POLICY.allowShellExecution, false);
  assert.equal(DEFAULT_POLICY.allowNetworkAccess, false);
});

test("scheduler creates a plan without launching workers", () => {
  const plan = createPlan();
  assert.equal(plan.mode, "READ_ONLY");
  assert.equal(plan.workersLaunched, 0);
  assert.equal(plan.tasks.length, 10);
  assert.equal(plan.ready.length, 1);
  assert.equal(plan.ready[0].id, "ST-001");
});

test("dependent tasks become ready only after prerequisites pass", () => {
  const tasks = buildTaskStates();
  tasks[0].state = "PASSED";
  const ready = getReadyTasks(tasks, 10);
  assert.deepEqual(ready.map(task => task.id), ["ST-002", "ST-003", "ST-004", "ST-006", "ST-010"]);
});

test("concurrency is bounded by available capacity and policy", () => {
  assert.equal(planConcurrency(1000, 32, 16), 16);
  assert.equal(planConcurrency(1000, 2000, 2000), 1000);
});

test("execution requires matching explicit approval and scope", () => {
  const action = { id: "ACT-1", mode: "APPROVED_EXECUTION", scope: "one-file" };
  assert.equal(mayExecute(action, { actionId: "ACT-1", approved: true, scope: "one-file" }), true);
  assert.equal(mayExecute(action, { actionId: "ACT-1", approved: true, scope: "all-files" }), false);
  assert.equal(mayExecute(action, null), false);
});

test("registry rejects dependency cycles", () => {
  const cyclic = [
    { id: "A", studio: "a", objective: "a", dependencies: ["B"] },
    { id: "B", studio: "b", objective: "b", dependencies: ["A"] }
  ];
  assert.throws(() => validateRegistry(cyclic), /cycle/i);
});
