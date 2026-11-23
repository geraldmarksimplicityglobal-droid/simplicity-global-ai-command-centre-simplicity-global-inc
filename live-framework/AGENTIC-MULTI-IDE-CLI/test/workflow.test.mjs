import test from "node:test";
import assert from "node:assert/strict";
import {
  createTask, transitionTask, approveTask, authorizeExecution,
  getTaskSnapshot
} from "../src/workflow.mjs";

function readyTask(risk = "medium") {
  const task = createTask({
    id: "SG-TASK-001",
    title: "Prepare isolated test patch",
    objective: "Create and validate a proposed patch",
    repository: "owner/repository",
    branch: "feature/isolated-work",
    risk
  }, "requester");
  transitionTask(task, "inspected", "inspector");
  transitionTask(task, "planned", "planner");
  transitionTask(task, "awaiting_approval", "planner");
  return task;
}

test("approval does not itself authorize execution", () => {
  const task = readyTask();
  approveTask(task, "reviewer");
  assert.equal(task.status, "approved");
  assert.throws(() => transitionTask(task, "executing", "runner"), /authorization required/);
});

test("execution authorization requires an approved task and explicit scope", () => {
  const task = readyTask();
  assert.throws(() => authorizeExecution(task, "authorizer", { operations: ["test"] }), /approved task/);
  approveTask(task, "reviewer");
  authorizeExecution(task, "authorizer", {
    operations: ["run-approved-tests"],
    resources: ["isolated-worktree"]
  });
  assert.equal(task.status, "execution_authorized");
  transitionTask(task, "executing", "runner");
  assert.equal(task.status, "executing");
});

test("high-risk task requires reviewer/requester separation", () => {
  const task = readyTask("high");
  assert.throws(() => approveTask(task, "requester"), /reviewer other than the requester/);
  approveTask(task, "independent-reviewer");
  assert.throws(() => authorizeExecution(task, "independent-reviewer", {
    operations: ["deploy"]
  }), /different person than the reviewer/);
  authorizeExecution(task, "release-authorizer", {
    operations: ["deploy-to-staging"],
    resources: ["staging-only"]
  });
  assert.equal(task.status, "execution_authorized");
});

test("rejected task cannot be authorized", () => {
  const task = readyTask();
  approveTask(task, "reviewer", "reject", "Risk not accepted");
  assert.equal(task.status, "rejected");
  assert.throws(() => authorizeExecution(task, "authorizer", {
    operations: ["write"]
  }), /approved task/);
});

test("event snapshots are detached from mutable task state", () => {
  const task = readyTask();
  const snapshot = getTaskSnapshot(task);
  snapshot.events.push({ type: "forged" });
  assert.equal(task.events.some(event => event.type === "forged"), false);
});
