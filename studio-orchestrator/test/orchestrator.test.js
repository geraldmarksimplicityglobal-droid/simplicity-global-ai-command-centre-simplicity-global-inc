import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_POLICY, INITIAL_STUDIOS, validatePolicy, validateTaskGraph,
  getReadyTasks, planBatch, recordReview, scaleConcurrency, statusReport
} from "../src/orchestrator.js";

test("initial registry contains ten isolated workstreams", () => {
  assert.equal(INITIAL_STUDIOS.length, 10);
  assert.equal(new Set(INITIAL_STUDIOS.map(t => t.workspace)).size, 10);
  assert.equal(validateTaskGraph(INITIAL_STUDIOS), true);
});

test("only dependency-free task is initially ready", () => {
  assert.deepEqual(getReadyTasks(INITIAL_STUDIOS).map(t => t.id), ["ST-001"]);
});

test("batch planner is bounded and never launches workers", () => {
  const plan = planBatch(INITIAL_STUDIOS, 1000, DEFAULT_POLICY);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].execution, "NOT_LAUNCHED");
  assert.equal(plan[0].mode, "READ_ONLY");
});

test("rejects dependency cycles", () => {
  assert.throws(() => validateTaskGraph([
    {id:"A",studio:"a",workspace:"a",dependencies:["B"]},
    {id:"B",studio:"b",workspace:"b",dependencies:["A"]}
  ]), /cycle/i);
});

test("rejects unsafe policy mode", () => {
  assert.throws(() => validatePolicy({...DEFAULT_POLICY,mode:"EXECUTE"}), /READ_ONLY/);
});

test("review requires explicit reviewer decision", () => {
  const task = {id:"X",state:"REVIEW"};
  assert.throws(() => recordReview(task,{passed:true}), /reviewer/);
  assert.equal(recordReview(task,{passed:true,reviewer:"security-review"}).state,"PASSED");
});

test("scaling respects capacity and reduces concurrency on failures", () => {
  assert.equal(scaleConcurrency({requested:1000,availableWorkers:20,resourceSlots:12,reviewSlots:8}),8);
  assert.equal(scaleConcurrency({requested:1000,availableWorkers:20,resourceSlots:12,reviewSlots:8,failureRate:0.1}),1);
});

test("status never overstates deployment", () => {
  const report = statusReport(INITIAL_STUDIOS);
  assert.equal(report.deployedAgents,0);
  assert.equal(report.executionEnabled,false);
});
