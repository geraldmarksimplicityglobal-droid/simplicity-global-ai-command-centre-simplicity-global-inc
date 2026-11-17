import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialQueue, getReadyTasks, calculateConcurrency,
  validateTask, transitionTask, createActionApproval
} from "../src/scheduler.mjs";

test("creates ten isolated read-only studio tasks", () => {
  const tasks = createInitialQueue();
  assert.equal(tasks.length, 10);
  assert.equal(new Set(tasks.map(t => t.workspace)).size, 10);
  assert.ok(tasks.every(t => t.mode === "READ_ONLY"));
});

test("only dependency-free tasks are initially ready", () => {
  const ready = getReadyTasks(createInitialQueue());
  assert.deepEqual(ready.map(t => t.id), ["ST-001"]);
});

test("unblocks dependent tasks only after dependency passes", () => {
  const tasks = createInitialQueue();
  tasks[0].state = "PASSED";
  assert.deepEqual(getReadyTasks(tasks).map(t => t.id),
    ["ST-002", "ST-003", "ST-004", "ST-005", "ST-006"]);
});

test("caps concurrency by workers, resources and policy", () => {
  assert.equal(calculateConcurrency({
    requested: 1000, availableWorkers: 80, resourceBudget: 32
  }), 32);
});

test("rejects invalid concurrency inputs", () => {
  assert.throws(() => calculateConcurrency({
    requested: -1, availableWorkers: 5, resourceBudget: 5
  }));
});

test("rejects path traversal workspaces", () => {
  const tasks = createInitialQueue();
  assert.throws(() => validateTask({
    ...tasks[0], workspace: "../shared"
  }, tasks));
});

test("requires review and approval before task passes", () => {
  const task = { ...createInitialQueue()[0], state: "REVIEW" };
  assert.throws(() => transitionTask(task, "PASSED"));
  assert.equal(transitionTask(task, "PASSED", {
    reviewed: true, approved: true
  }).state, "PASSED");
});

test("approval must match action identity and scope", () => {
  const action = { actionId: "A-1", scope: "workspace/demo" };
  assert.throws(() => createActionApproval(action, {
    actionId: "A-2", scope: "workspace/demo", approved: true
  }));
  assert.equal(createActionApproval(action, {
    actionId: "A-1", scope: "workspace/demo", approved: true
  }).approved, true);
});
