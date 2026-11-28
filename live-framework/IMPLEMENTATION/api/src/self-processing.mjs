const PRIORITY = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });
const REQUIRED_INTERLOCKS = Object.freeze([
  "killSwitchClear", "policyReachable", "policyVersionMatch", "approvalValid",
  "approvalSingleUse", "intentHashMatch", "screeningClear",
  "limitsAndAllowlistPass", "credentialScoped", "budgetAvailable", "iterationWithinCap"
]);
const LOOP_TRANSITIONS = Object.freeze({
  created: new Set(["validated", "cancelled"]),
  validated: new Set(["screened", "cancelled"]),
  screened: new Set(["mandate_ok", "held", "cancelled"]),
  mandate_ok: new Set(["approved", "held", "cancelled"]),
  approved: new Set(["sent", "cancelled"]),
  sent: new Set(["pending", "settled", "failed_transient", "failed_terminal", "returned", "unknown"]),
  pending: new Set(["settled", "failed_transient", "failed_terminal", "returned", "unknown"]),
  failed_transient: new Set(["pending", "dead_letter"]),
  unknown: new Set(["query_pending", "settled", "failed_terminal"]),
  query_pending: new Set(["query_pending", "settled", "failed_terminal", "unknown"]),
  settled: new Set(["reconciled"]),
  reconciled: new Set(["closed"]),
  held: new Set(["cancelled"]),
  returned: new Set(["reconciled"]),
  failed_terminal: new Set(),
  dead_letter: new Set(),
  closed: new Set(),
  cancelled: new Set()
});
const lockTails = new Map();

function finiteNonNegative(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(name + " must be a finite non-negative number");
  }
  return value;
}

export function validateLoopConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("loop config required");
  const maxIterations = input.maxIterations;
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 100) {
    throw new RangeError("maxIterations must be an integer between 1 and 100");
  }
  const budget = input.budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) throw new TypeError("budget is required");
  for (const key of ["tokens", "usd", "seconds"]) finiteNonNegative(budget[key], "budget." + key);
  if (budget.tokens < 1 || budget.usd <= 0 || budget.seconds <= 0) throw new RangeError("budget must provide positive token, USD and time ceilings");
  return Object.freeze({
    maxIterations,
    budget: Object.freeze({ tokens: budget.tokens, usd: budget.usd, seconds: budget.seconds })
  });
}

export function consumeLoopBudget(current, usage) {
  if (!current || !usage) throw new TypeError("current budget and usage are required");
  const next = {};
  for (const key of ["tokens", "usd", "seconds", "iterations"]) {
    const available = finiteNonNegative(current[key], "current." + key);
    const spent = finiteNonNegative(usage[key], "usage." + key);
    if (spent > available) throw new RangeError("budget exceeded: " + key);
    next[key] = key === "usd" || key === "seconds" ? Number((available - spent).toFixed(9)) : available - spent;
  }
  next.exhausted = next.tokens === 0 || next.usd === 0 || next.seconds === 0 || next.iterations === 0;
  return Object.freeze(next);
}

export function assertLoopInterlocks(interlocks) {
  if (!interlocks || typeof interlocks !== "object" || Array.isArray(interlocks)) throw new TypeError("interlock state required");
  const failed = REQUIRED_INTERLOCKS.filter(key => interlocks[key] !== true);
  if (failed.length) throw new Error("self-processing interlock failed closed: " + failed.join(","));
  return true;
}

export function scheduleWithinPriority(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  return tasks.map((task, index) => {
    if (!task || typeof task !== "object" || typeof task.id !== "string" || !task.id.trim()) throw new TypeError("each task requires an id");
    if (!Object.hasOwn(PRIORITY, task.priority)) throw new TypeError("invalid priority class");
    if (task.promoteTo != null && !Object.hasOwn(PRIORITY, task.promoteTo)) {
      throw new TypeError("invalid promoteTo priority class");
    }
    if (task.promoteTo != null && PRIORITY[task.promoteTo] < PRIORITY[task.priority]) {
      throw new Error("priority promotion across classes is prohibited");
    }
    const deadline = task.deadline == null ? Number.MAX_SAFE_INTEGER : task.deadline;
    if (typeof deadline !== "number" || !Number.isFinite(deadline)) throw new TypeError("deadline must be a finite number");
    return { task, index, deadline };
  }).sort((a, b) => PRIORITY[a.task.priority] - PRIORITY[b.task.priority] ||
    a.deadline - b.deadline || a.index - b.index).map(({ task }) => Object.freeze({ ...task }));
}

export function clampAdaptation(proposed, bounds) {
  if (typeof proposed !== "number" || !Number.isFinite(proposed) ||
      !bounds || typeof bounds.min !== "number" || typeof bounds.max !== "number" ||
      !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) || bounds.min > bounds.max) {
    throw new TypeError("adaptation value and valid finite bounds are required");
  }
  return Math.min(bounds.max, Math.max(bounds.min, proposed));
}

export function assertLoopTransition(current, next) {
  if (current === "unknown" && next === "sent") throw new Error("UNKNOWN is query-only; resend is prohibited");
  if (!LOOP_TRANSITIONS[current]?.has(next)) throw new Error("invalid loop transition: " + current + " -> " + next);
  return true;
}

export function createIdempotentRecoveryPlan({ state, retryCount = 0, maxRetries = 3, statusChecked = false, idempotencyKey } = {}) {
  if (!Number.isInteger(retryCount) || retryCount < 0 || !Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new TypeError("retry counters must be non-negative integers");
  }
  if (state === "unknown" || state === "pending") {
    return Object.freeze({ action: "query_status", resend: false, reason: state === "unknown" ? "unknown-is-query-only" : "pending-status-check" });
  }
  if (state === "failed_transient" && (statusChecked !== true ||
      typeof idempotencyKey !== "string" || !idempotencyKey.trim())) {
    return Object.freeze({ action: "query_status", resend: false, reason: "authoritative-status-and-idempotency-key-required" });
  }
  if (state === "failed_transient" && retryCount < maxRetries) {
    return Object.freeze({ action: "retry_same_idempotency_key", resend: true,
      idempotencyKey, reason: "transient-failure-within-retry-budget" });
  }
  if (state === "failed_transient") {
    return Object.freeze({ action: "dead_letter", resend: false, reason: "retry-budget-exhausted" });
  }
  return Object.freeze({ action: "manual_review", resend: false, reason: "state-not-automatically-recoverable" });
}

export async function withKeyedLock(key, operation) {
  if (typeof key !== "string" || !key.trim() || typeof operation !== "function") throw new TypeError("lock key and operation required");
  const previous = lockTails.get(key) ?? Promise.resolve();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => gate);
  lockTails.set(key, tail);
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
    if (lockTails.get(key) === tail) lockTails.delete(key);
  }
}


export function planConcurrencyAdmission({
  globalInFlight, globalMax, railInFlight, railMax, resourceLocked = false
} = {}) {
  for (const [name, value] of Object.entries({ globalInFlight, globalMax, railInFlight, railMax })) {
    if (!Number.isInteger(value) || value < 0) throw new TypeError(name + " must be a non-negative integer");
  }
  if (globalMax < 1 || railMax < 1) throw new RangeError("concurrency maxima must be positive");
  if (typeof resourceLocked !== "boolean") throw new TypeError("resourceLocked must be boolean");
  const reasons = [];
  if (resourceLocked) reasons.push("resource_serialization_lock");
  if (railInFlight >= railMax) reasons.push("rail_concurrency_limit");
  if (globalInFlight >= globalMax) reasons.push("global_in_flight_limit");
  return Object.freeze({ admitted: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function applyQueueBackpressure(tasks, { queueDepth, maxQueueDepth } = {}) {
  if (!Array.isArray(tasks)) throw new TypeError("tasks must be an array");
  if (!Number.isInteger(queueDepth) || queueDepth < 0 ||
      !Number.isInteger(maxQueueDepth) || maxQueueDepth < 1) {
    throw new TypeError("queueDepth and positive maxQueueDepth are required");
  }
  const ready = [];
  const deferred = [];
  for (const task of tasks) {
    if (!task || typeof task !== "object" || !Object.hasOwn(PRIORITY, task.priority)) {
      throw new TypeError("each task requires a valid priority class");
    }
    if (queueDepth > maxQueueDepth && (task.priority === "P2" || task.priority === "P3")) {
      deferred.push(Object.freeze({ ...task, schedulingState: "deferred_backpressure" }));
    } else {
      ready.push(Object.freeze({ ...task, schedulingState: "ready" }));
    }
  }
  return Object.freeze({
    ready: Object.freeze(ready),
    deferred: Object.freeze(deferred),
    intakeThrottled: queueDepth > maxQueueDepth
  });
}
