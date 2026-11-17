import { DEFAULT_CONCURRENCY, MAX_LOGICAL_WORKERS } from "./registry.mjs";

const TERMINAL = new Set(["PASSED", "FAILED", "CANCELLED"]);

export function validateTaskGraph(tasks) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error("Duplicate task IDs");

  for (const task of tasks) {
    if (!task.id || !task.studio || !task.workspace) throw new Error("Task identity fields are required");
    for (const dependency of task.dependencies ?? []) {
      if (!byId.has(dependency)) throw new Error(`Unknown dependency ${dependency} in ${task.id}`);
      if (dependency === task.id) throw new Error(`Task ${task.id} cannot depend on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Dependency cycle detected at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependencies ?? []) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return true;
}

export function resolveConcurrency({ requested = DEFAULT_CONCURRENCY, availableWorkers = DEFAULT_CONCURRENCY, resourceBudget = DEFAULT_CONCURRENCY } = {}) {
  for (const [name, value] of Object.entries({ requested, availableWorkers, resourceBudget })) {
    if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`);
  }
  return Math.min(requested, availableWorkers, resourceBudget, MAX_LOGICAL_WORKERS);
}

export function getReadyTasks(tasks) {
  validateTaskGraph(tasks);
  const passed = new Set(tasks.filter(task => task.state === "PASSED").map(task => task.id));
  return tasks.filter(task =>
    task.state === "QUEUED" &&
    (task.dependencies ?? []).every(dependency => passed.has(dependency))
  );
}

export function createPlan(tasks, options = {}) {
  const concurrency = resolveConcurrency(options);
  const ready = getReadyTasks(tasks);
  const blocked = tasks.filter(task => task.state === "QUEUED" && !ready.includes(task));
  return {
    mode: "PLANNING_ONLY",
    concurrency,
    logicalWorkerTarget: MAX_LOGICAL_WORKERS,
    ready: ready.slice(0, concurrency).map(({ id, studio, workspace, objective, mode }) => ({ id, studio, workspace, objective, mode })),
    waiting: blocked.map(task => ({ id: task.id, dependencies: task.dependencies })),
    active: tasks.filter(task => task.state === "RUNNING").map(task => task.id),
    terminal: tasks.filter(task => TERMINAL.has(task.state)).map(task => ({ id: task.id, state: task.state })),
    executionEnabled: false,
    reason: "No worker backend is configured; this planner does not launch agents or execute tasks."
  };
}

export function assertApproval(action, approval) {
  if (!action || !approval) throw new Error("An explicit action and approval record are required");
  if (approval.actionId !== action.id || approval.approved !== true) throw new Error("Approval missing, denied, or scoped to another action");
  if (approval.scope !== action.scope) throw new Error("Approval scope mismatch");
  if (action.mode === "READ_ONLY" && action.requiresWrite === true) throw new Error("Read-only task cannot perform writes");
  return true;
}
