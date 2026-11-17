import test from "node:test";
import assert from "node:assert/strict";
import { createPlan, readyWorkstreams, resolveConcurrency, validateRegistry, workspaceFor } from "./orchestrator.mjs";

test("registry contains ten unique workstreams", () => {
  assert.equal(validateRegistry(), true);
  assert.equal(createPlan().tasks.length, 10);
});

test("planner never launches workers", () => {
  const plan = createPlan();
  assert.equal(plan.executionMode, "PLAN_ONLY");
  assert.equal(plan.workersLaunched, 0);
});

test("dependency gate exposes architecture first", () => {
  assert.deepEqual(readyWorkstreams().map((task) => task.id), ["ST-001"]);
});

test("passed dependency unlocks dependent tasks", () => {
  const ready = readyWorkstreams({ "ST-001": "PASSED" }).map((task) => task.id);
  assert.ok(ready.includes("ST-002"));
  assert.ok(ready.includes("ST-004"));
  assert.ok(!ready.includes("ST-005"));
});

test("concurrency is bounded by all resource limits", () => {
  assert.equal(resolveConcurrency(1000, 32, 12), 12);
  assert.equal(resolveConcurrency(1000, 2000, 2000), 1000);
});

test("invalid concurrency is rejected", () => {
  assert.throws(() => resolveConcurrency(0, 4, 4));
});

test("workspace paths are isolated by task id", () => {
  assert.match(workspaceFor("/tmp/sg", "ST-001"), /studio-workspaces[\\/]ST-001$/);
  assert.throws(() => workspaceFor("/tmp/sg", "../../outside"));
});
