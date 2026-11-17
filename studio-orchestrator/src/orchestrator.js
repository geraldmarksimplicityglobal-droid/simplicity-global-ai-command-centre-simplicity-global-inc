/**
 * SG-CODEX X1000 Studio Orchestrator
 * Safe task scheduling only: no shell execution, file writes, network calls,
 * agent deployment, or worker provisioning.
 */

export const DEFAULT_POLICY = Object.freeze({
  maxLogicalWorkers: 1000,
  initialConcurrency: 10,
  maxConcurrency: 10,
  mode: "READ_ONLY",
  requireReview: true,
  requireApprovalForExecution: true
});

export const INITIAL_STUDIOS = Object.freeze([
  ["ST-001", "architecture", []],
  ["ST-002", "android", ["ST-001"]],
  ["ST-003", "windows", ["ST-001"]],
  ["ST-004", "dsh", ["ST-001"]],
  ["ST-005", "codex-bridge", ["ST-001", "ST-004"]],
  ["ST-006", "governance", ["ST-001"]],
  ["ST-007", "security", ["ST-005", "ST-006"]],
  ["ST-008", "testing", ["ST-002", "ST-003", "ST-004", "ST-005", "ST-006", "ST-007"]],
  ["ST-009", "build", ["ST-002", "ST-003", "ST-004", "ST-008"]],
  ["ST-010", "documentation", ["ST-001", "ST-007", "ST-008", "ST-009"]]
].map(([id, studio, dependencies]) => Object.freeze({
  id, studio, dependencies,
  workspace: `workspaces/${studio}`,
  state: "QUEUED",
  mode: "READ_ONLY",
  requiresReview: true
})));

const TERMINAL = new Set(["PASSED", "FAILED", "BLOCKED"]);

export function validatePolicy(policy = DEFAULT_POLICY) {
  if (!Number.isInteger(policy.maxLogicalWorkers) ||
      policy.maxLogicalWorkers < 1 ||
      policy.maxLogicalWorkers > 1000) {
    throw new Error("maxLogicalWorkers must be an integer from 1 to 1000");
  }
  if (!Number.isInteger(policy.maxConcurrency) ||
      policy.maxConcurrency < 1 ||
      policy.maxConcurrency > policy.maxLogicalWorkers) {
    throw new Error("maxConcurrency must be within the logical worker limit");
  }
  if (policy.mode !== "READ_ONLY") {
    throw new Error("Only READ_ONLY mode is implemented in this release");
  }
  return true;
}

export function validateTaskGraph(tasks) {
  const ids = new Set(tasks.map(t => t.id));
  if (ids.size !== tasks.length) throw new Error("Duplicate task ID");
  for (const task of tasks) {
    if (!task.id || !task.studio || !task.workspace) throw new Error("Incomplete task");
    if (!Array.isArray(task.dependencies)) throw new Error("Dependencies must be an array");
    for (const dep of task.dependencies) {
      if (!ids.has(dep)) throw new Error(`Unknown dependency: ${dep}`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(tasks.map(t => [t.id, t]));
  function visit(id) {
    if (visiting.has(id)) throw new Error("Dependency cycle detected");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependencies) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return true;
}

export function getReadyTasks(tasks) {
  const passed = new Set(tasks.filter(t => t.state === "PASSED").map(t => t.id));
  return tasks.filter(t =>
    t.state === "QUEUED" &&
    t.dependencies.every(dep => passed.has(dep))
  );
}

export function planBatch(tasks, requestedConcurrency, policy = DEFAULT_POLICY) {
  validatePolicy(policy);
  validateTaskGraph(tasks);
  const concurrency = Math.min(
    Math.max(1, Math.floor(requestedConcurrency)),
    policy.maxConcurrency,
    policy.maxLogicalWorkers
  );
  return getReadyTasks(tasks).slice(0, concurrency).map(task => ({
    taskId: task.id,
    studio: task.studio,
    workspace: task.workspace,
    mode: "READ_ONLY",
    execution: "NOT_LAUNCHED",
    requiresReview: true
  }));
}

export function recordReview(task, review) {
  if (!task || task.state !== "REVIEW") throw new Error("Task is not awaiting review");
  if (!review || typeof review.passed !== "boolean" || !review.reviewer) {
    throw new Error("A named reviewer and explicit decision are required");
  }
  return {
    ...task,
    state: review.passed ? "PASSED" : "FAILED",
    review: { reviewer: review.reviewer, passed: review.passed, notes: review.notes ?? "" }
  };
}

export function scaleConcurrency(metrics, policy = DEFAULT_POLICY) {
  validatePolicy(policy);
  const { requested = 10, availableWorkers = 1, resourceSlots = 1,
    reviewSlots = 1, failureRate = 0 } = metrics ?? {};
  if (failureRate > 0.05) return 1;
  const safeCapacity = Math.min(
    requested, availableWorkers, resourceSlots, reviewSlots,
    policy.maxConcurrency, policy.maxLogicalWorkers
  );
  return Math.max(1, Math.floor(safeCapacity));
}

export function statusReport(tasks) {
  const counts = Object.fromEntries(
    ["QUEUED","READY","RUNNING","REVIEW","PASSED","FAILED","BLOCKED"]
      .map(state => [state, tasks.filter(t => t.state === state).length])
  );
  return {
    logicalWorkerTarget: 1000,
    definedWorkstreams: tasks.length,
    deployedAgents: 0,
    counts,
    executionEnabled: false,
    mode: "READ_ONLY"
  };
}
