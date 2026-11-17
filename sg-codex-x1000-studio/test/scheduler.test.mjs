import test from "node:test";
import assert from "node:assert/strict";
import { studioTasks, MAX_LOGICAL_WORKERS } from "../src/registry.mjs";
import { validateTaskGraph, resolveConcurrency, getReadyTasks, createPlan, assertApproval } from "../src/scheduler.mjs";

test("initial registry contains ten isolated read-only studios", () => {
  assert.equal(studioTasks.length, 10);
  assert.equal(new Set(studioTasks.map(task => task.workspace)).size, 10);
  assert.ok(studioTasks.every(task => task.mode === "READ_ONLY" && task.requiresReview));
});

test("task graph is valid and acyclic", () => {
  assert.equal(validateTaskGraph(studioTasks), true);
});

test("unknown dependencies and cycles are rejected", () => {
  assert.throws(() => validateTaskGraph([{ id: "A", studio: "a", workspace: "a", dependencies: ["B"] }]), /Unknown dependency/);
  assert.throws(() => validateTaskGraph([
    { id: "A", studio: "a", workspace: "a", dependencies: ["B"] },
    { id: "B", studio: "b", workspace: "b", dependencies: ["A"] }
  ]), /cycle/i);
});

test("concurrency is bounded by worker and resource availability", () => {
  assert.equal(resolveConcurrency({ requested: 1000, availableWorkers: 40, resourceBudget: 12 }), 12);
  assert.equal(resolveConcurrency({ requested: 5000, availableWorkers: 2000, resourceBudget: 1500 }), MAX_LOGICAL_WORKERS);
  assert.throws(() => resolveConcurrency({ requested: 0 }), /positive integer/);
});

test("ready tasks are restricted by dependencies", () => {
  const tasks = studioTasks.map(task => ({ ...task, dependencies: [...task.dependencies] }));
  assert.deepEqual(getReadyTasks(tasks).map(task => task.id), ["ST-001"]);
  tasks[0].state = "PASSED";
  assert.deepEqual(getReadyTasks(tasks).map(task => task.id), ["ST-002", "ST-003", "ST-004", "ST-005", "ST-006", "ST-010"]);
});

test("plan is planning-only and never enables execution", () => {
  const plan = createPlan(studioTasks, { requested: 10 });
  assert.equal(plan.mode, "PLANNING_ONLY");
  assert.equal(plan.executionEnabled, false);
  assert.equal(plan.ready.length, 1);
  assert.equal(plan.logicalWorkerTarget, 1000);
});

test("approval must match action identity and exact scope", () => {
  const action = { id: "A1", scope: "workspace/project-a", mode: "PATCH_PROPOSAL" };
  assert.equal(assertApproval(action, { actionId: "A1", scope: "workspace/project-a", approved: true }), true);
  assert.throws(() => assertApproval(action, { actionId: "A2", scope: "workspace/project-a", approved: true }), /scope|another action/i);
  assert.throws(() => assertApproval(action, { actionId: "A1", scope: "workspace/other", approved: true }), /scope mismatch/i);
});
