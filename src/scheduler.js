import { INITIAL_CONCURRENCY, MAX_LOGICAL_WORKERS, studioTasks, validateRegistry } from "./registry.js";
import { DEFAULT_POLICY, validatePolicy } from "./policy.js";

export function buildTaskStates(tasks = studioTasks) {
  validateRegistry(tasks);
  return tasks.map(task => ({ ...task, state: "QUEUED", workspace: `isolated/${task.id}` }));
}

export function getReadyTasks(tasks, limit = INITIAL_CONCURRENCY) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Concurrency limit must be a positive integer");
  const passed = new Set(tasks.filter(task => task.state === "PASSED").map(task => task.id));
  return tasks.filter(task =>
    task.state === "QUEUED" &&
    task.dependencies.every(dependency => passed.has(dependency))
  ).slice(0, limit);
}

export function planConcurrency(requested, availableWorkers, resourceBudget, policy = DEFAULT_POLICY) {
  validatePolicy(policy);
  for (const value of [requested, availableWorkers, resourceBudget]) {
    if (!Number.isInteger(value) || value < 1) throw new Error("Worker capacity inputs must be positive integers");
  }
  return Math.min(requested, availableWorkers, resourceBudget, policy.maxLogicalWorkers, MAX_LOGICAL_WORKERS);
}

export function createPlan(options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  validatePolicy(policy);
  const tasks = buildTaskStates(options.tasks ?? studioTasks);
  const concurrency = planConcurrency(
    options.requestedConcurrency ?? policy.initialConcurrency,
    options.availableWorkers ?? policy.initialConcurrency,
    options.resourceBudget ?? policy.initialConcurrency,
    policy
  );
  return Object.freeze({
    mode: "READ_ONLY",
    workersLaunched: 0,
    concurrency,
    logicalWorkerCeiling: MAX_LOGICAL_WORKERS,
    tasks,
    ready: getReadyTasks(tasks, concurrency).map(({ id, studio, objective, workspace }) =>
      ({ id, studio, objective, workspace })
    )
  });
}
