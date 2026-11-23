const transitions = Object.freeze({
  submitted: new Set(["inspected", "cancelled"]),
  inspected: new Set(["planned", "cancelled"]),
  planned: new Set(["awaiting_approval", "cancelled"]),
  awaiting_approval: new Set(["approved", "rejected", "cancelled"]),
  approved: new Set(["execution_authorized", "cancelled"]),
  execution_authorized: new Set(["executing", "cancelled"]),
  executing: new Set(["validating", "failed", "cancelled"]),
  validating: new Set(["completed", "failed"]),
  completed: new Set(),
  rejected: new Set(),
  failed: new Set(["planned", "cancelled"]),
  cancelled: new Set()
});

const validRisk = new Set(["low", "medium", "high"]);

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(field + " must be a non-empty string");
  }
  return value.trim();
}

function appendEvent(task, type, actor, details = {}) {
  task.events.push(Object.freeze({
    sequence: task.events.length + 1,
    type,
    actor: requiredText(actor, "actor"),
    at: new Date().toISOString(),
    details: structuredClone(details)
  }));
}

export function createTask(input, actor) {
  if (!input || typeof input !== "object") throw new TypeError("task input required");
  const risk = input.risk ?? "medium";
  if (!validRisk.has(risk)) throw new TypeError("risk must be low, medium, or high");
  const task = {
    id: requiredText(input.id, "id"),
    title: requiredText(input.title, "title"),
    objective: requiredText(input.objective, "objective"),
    requester: requiredText(actor, "actor"),
    repository: input.repository ? requiredText(input.repository, "repository") : null,
    branch: input.branch ? requiredText(input.branch, "branch") : null,
    risk,
    status: "submitted",
    approval: null,
    executionAuthorization: null,
    events: []
  };
  appendEvent(task, "task.submitted", actor, {
    risk, repository: task.repository, branch: task.branch
  });
  return task;
}

export function transitionTask(task, nextStatus, actor, details = {}) {
  requiredText(actor, "actor");
  if (nextStatus === "executing" && !task?.executionAuthorization) {
    throw new Error("execution authorization required");
  }
  if (!task || !transitions[task.status]?.has(nextStatus)) {
    throw new Error("invalid task transition");
  }
  if (nextStatus === "approved") {
    throw new Error("use approveTask to record reviewer identity");
  }
  if (nextStatus === "execution_authorized") {
    throw new Error("use authorizeExecution to record execution scope");
  }
  task.status = nextStatus;
  appendEvent(task, "task." + nextStatus, actor, details);
  return task;
}

export function approveTask(task, reviewer, decision = "approve", reason = "") {
  requiredText(reviewer, "reviewer");
  if (task?.status !== "awaiting_approval") throw new Error("task is not awaiting approval");
  if (!["approve", "reject"].includes(decision)) throw new TypeError("decision must be approve or reject");
  if (task.risk === "high" && reviewer === task.requester) {
    throw new Error("high-risk tasks require a reviewer other than the requester");
  }
  task.approval = Object.freeze({ reviewer, decision, reason: String(reason).slice(0, 2000), at: new Date().toISOString() });
  task.status = decision === "approve" ? "approved" : "rejected";
  appendEvent(task, "task." + task.status, reviewer, { decision, reason: task.approval.reason });
  return task;
}

export function authorizeExecution(task, authorizer, scope) {
  requiredText(authorizer, "authorizer");
  if (task?.status !== "approved" || task.approval?.decision !== "approve") {
    throw new Error("an approved task is required before execution authorization");
  }
  if (!scope || typeof scope !== "object" || !Array.isArray(scope.operations) || scope.operations.length === 0) {
    throw new TypeError("execution scope must declare one or more operations");
  }
  const operations = scope.operations.map(value => requiredText(value, "operation"));
  if (task.risk === "high" && authorizer === task.approval.reviewer) {
    throw new Error("high-risk execution authorization must be performed by a different person than the reviewer");
  }
  task.executionAuthorization = Object.freeze({
    authorizer,
    operations: Object.freeze([...new Set(operations)]),
    resources: Object.freeze((scope.resources ?? []).map(value => requiredText(value, "resource"))),
    at: new Date().toISOString()
  });
  task.status = "execution_authorized";
  appendEvent(task, "task.execution_authorized", authorizer, {
    operations: task.executionAuthorization.operations,
    resources: task.executionAuthorization.resources
  });
  return task;
}

export function getTaskSnapshot(task) {
  if (!task) throw new TypeError("task required");
  return structuredClone(task);
}

export const TASK_STATUSES = Object.freeze(Object.keys(transitions));
