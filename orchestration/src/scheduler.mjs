export const DEFAULT_POLICY = Object.freeze({
  maxLogicalWorkers: 1000,
  initialConcurrency: 10,
  maxConcurrency: 1000,
  defaultMode: "READ_ONLY",
  isolatedWorkspacePerTask: true,
  sharedWrites: false,
  requireReviewBeforeMerge: true,
  requireApprovalForExecution: true
});

export const INITIAL_STUDIOS = Object.freeze([
  ["ST-001", "architecture", []],
  ["ST-002", "android", ["ST-001"]],
  ["ST-003", "windows", ["ST-001"]],
  ["ST-004", "dsh", ["ST-001"]],
  ["ST-005", "codex-bridge", ["ST-001"]],
  ["ST-006", "governance", ["ST-001"]],
  ["ST-007", "security", ["ST-005", "ST-006"]],
  ["ST-008", "testing", ["ST-005", "ST-006", "ST-007"]],
  ["ST-009", "build", ["ST-002", "ST-003", "ST-004", "ST-008"]],
  ["ST-010", "documentation", ["ST-001", "ST-007", "ST-008", "ST-009"]]
]);

export function createInitialQueue() {
  return INITIAL_STUDIOS.map(([id, studio, dependencies]) => ({
    id,
    studio,
    workspace: `studio/${studio}`,
    dependencies: [...dependencies],
    state: "QUEUED",
    mode: "READ_ONLY",
    requiresReview: true,
    attempts: 0
  }));
}

export function getReadyTasks(tasks) {
  const passed = new Set(tasks.filter(t => t.state === "PASSED").map(t => t.id));
  return tasks.filter(t =>
    t.state === "QUEUED" &&
    t.dependencies.every(id => passed.has(id))
  );
}

export function calculateConcurrency({
  requested,
  availableWorkers,
  resourceBudget,
  policy = DEFAULT_POLICY
}) {
  for (const [key, value] of Object.entries({ requested, availableWorkers, resourceBudget })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError(`${key} must be a non-negative integer`);
    }
  }
  if (requested === 0 || availableWorkers === 0 || resourceBudget === 0) return 0;
  return Math.min(requested, availableWorkers, resourceBudget, policy.maxConcurrency);
}

export function validateTask(task, tasks) {
  if (!task || typeof task.id !== "string" || typeof task.studio !== "string") {
    throw new TypeError("Task requires id and studio");
  }
  if (!task.workspace || task.workspace.startsWith("/") || task.workspace.includes("..")) {
    throw new Error("Workspace must be a safe relative path");
  }
  if (task.mode !== "READ_ONLY" && task.mode !== "PATCH_PROPOSAL") {
    throw new Error("Unsupported task mode");
  }
  if (!Array.isArray(task.dependencies)) throw new TypeError("Dependencies must be an array");
  const ids = new Set(tasks.map(t => t.id));
  for (const dependency of task.dependencies) {
    if (!ids.has(dependency)) throw new Error(`Unknown dependency: ${dependency}`);
    if (dependency === task.id) throw new Error("Task cannot depend on itself");
  }
  return true;
}

export function transitionTask(task, nextState, { reviewed = false, approved = false } = {}) {
  const allowed = {
    QUEUED: ["READY", "BLOCKED"],
    READY: ["RUNNING", "BLOCKED"],
    RUNNING: ["REVIEW", "FAILED", "BLOCKED"],
    REVIEW: ["PASSED", "QUEUED", "BLOCKED"],
    BLOCKED: ["QUEUED"],
    FAILED: ["QUEUED"],
    PASSED: []
  };
  if (!allowed[task.state]?.includes(nextState)) {
    throw new Error(`Invalid transition: ${task.state} -> ${nextState}`);
  }
  if (nextState === "PASSED" && (!reviewed || !approved)) {
    throw new Error("A task requires review and integration approval before passing");
  }
  return { ...task, state: nextState };
}

export function createActionApproval(action, decision) {
  if (!action?.actionId || !action?.scope) throw new TypeError("Action ID and scope required");
  if (!decision?.approved) throw new Error("Action not approved");
  if (decision.actionId !== action.actionId || decision.scope !== action.scope) {
    throw new Error("Approval does not match action and scope");
  }
  return Object.freeze({
    actionId: action.actionId,
    scope: action.scope,
    approved: true,
    approvedAt: decision.approvedAt ?? new Date().toISOString()
  });
}
