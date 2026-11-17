import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateConcurrency,
  createInitialQueue,
  getReadyTasks,
  mayIntegrate,
  validateTaskGraph
} from "./orchestrator.js";

test("creates ten independent read-only studio tasks", () => {
  const tasks = createInitialQueue();
  assert.equal(tasks.length, 10);
  assert.ok(tasks.every(task => task.mode === "READ_ONLY"));
  assert.equal(new Set(tasks.map(task => task.workspace)).size, 10);
});

test("initial tasks are ready when they have no dependencies", () => {
  assert.equal(getReadyTasks(createInitialQueue()).length, 10);
});

test("caps concurrency at requested, available, budget and policy limits", () => {
  assert.equal(calculateConcurrency({
    availableWorkers: 80,
    resourceBudget: 24,
    requestedWorkers: 1000
  }), 24);
});

test("rejects invalid capacity values", () => {
  assert.throws(() => calculateConcurrency({
    availableWorkers: -1,
    resourceBudget: 10,
    requestedWorkers: 10
  }));
});

test("requires review and approval before integration", () => {
  const task = createInitialQueue()[0]!;
  task.state = "REVIEW";
  assert.equal(mayIntegrate(task, false), false);
  assert.equal(mayIntegrate(task, true), true);
});

test("validates workspace isolation and dependencies", () => {
  const tasks = createInitialQueue();
  assert.deepEqual(validateTaskGraph(tasks), []);
  tasks[0]!.workspace = "../shared";
  tasks[1]!.dependencies = ["missing"];
  assert.equal(validateTaskGraph(tasks).length, 2);
});
