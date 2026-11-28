const PRIORITIES = ["P0", "P1", "P2", "P3"];
const STAGES = ["intake", "classification", "screening", "router", "executor", "reconciler"];
const LOCK_ORDER = ["payee", "account", "rail"];
const INTERLOCKS = [
  "kill_switch_clear", "policy_available", "policy_version_match", "approval_valid",
  "screening_clear", "limits_allowlists_chain_pass", "credential_valid",
  "budget_available", "iteration_within_cap"
];

export function validateLoopConfig(config) {
  const errors = [];
  if (!Number.isSafeInteger(config?.max_iterations) || config.max_iterations < 1 || config.max_iterations > 100) errors.push("max_iterations_invalid");
  for (const key of ["tokens", "usd", "seconds"]) {
    const value = config?.budget?.[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) errors.push(`budget_${key}_invalid`);
  }
  for (const key of ["per_rail_cap", "in_flight_max"]) {
    const value = config?.concurrency?.[key];
    if (!Number.isSafeInteger(value) || value < 1) errors.push(`concurrency_${key}_invalid`);
  }
  if (config?.recovery?.unknown_policy !== "query_only") errors.push("unknown_policy_must_be_query_only");
  if (config?.recovery?.irreversible_retry !== 0) errors.push("irreversible_retry_must_be_zero");
  return { valid: errors.length === 0, errors };
}

export function orderWithinPriority(intents) {
  for (const intent of intents) if (!PRIORITIES.includes(intent.priority)) throw new Error(`unknown priority: ${intent.priority}`);
  return intents.map((intent, index) => ({ intent, index }))
    .sort((a, b) => PRIORITIES.indexOf(a.intent.priority) - PRIORITIES.indexOf(b.intent.priority)
      || Date.parse(a.intent.deadline ?? "9999-12-31T23:59:59Z") - Date.parse(b.intent.deadline ?? "9999-12-31T23:59:59Z")
      || a.index - b.index)
    .map(({ intent }) => intent);
}

export function admitIntent(intent, activeIntents, config) {
  if (config?.concurrency?.per_payee_lock && activeIntents.some(x => x.payee_id && x.payee_id === intent.payee_id)) return { allowed: false, reason: "payee_locked" };
  const railCount = activeIntents.filter(x => x.rail === intent.rail).length;
  if (railCount >= config.concurrency.per_rail_cap) return { allowed: false, reason: "rail_capacity" };
  if (activeIntents.length >= config.concurrency.in_flight_max) return { allowed: false, reason: "global_in_flight_budget" };
  return { allowed: true, reason: "admitted" };
}

export function checkInterlocks(interlocks) {
  const failed = INTERLOCKS.filter(key => interlocks?.[key] !== true);
  return { allowed: failed.length === 0, failed, action: failed.length ? "FAIL_CLOSED_ALERT_ESCALATE" : "CONTINUE" };
}

export function decideRecovery({ state, errorClass, attempt = 1, config, irreversible = false }) {
  if (state === "UNKNOWN") return { action: "QUERY_ONLY", retry: false };
  if (irreversible || config?.recovery?.irreversible_retry === 0 && errorClass === "irreversible") return { action: "HOLD_AND_ESCALATE", retry: false };
  if (errorClass === "transient" && Number.isSafeInteger(attempt) && attempt <= config?.recovery?.retry_transient) return { action: "RETRY_SAME_IDEMPOTENCY_KEY_WITH_BACKOFF", retry: true };
  if (errorClass === "connector_repeated_failure") return { action: "QUARANTINE_CONNECTOR", retry: false };
  return { action: "HOLD_AND_ESCALATE", retry: false };
}

export function debitBudget(remaining, usage) {
  const next = {};
  for (const key of ["tokens", "usd", "seconds"]) {
    if (typeof usage?.[key] !== "number" || !Number.isFinite(usage[key]) || usage[key] < 0) return { allowed: false, reason: "invalid_usage" };
    if (typeof remaining?.[key] !== "number" || usage[key] > remaining[key]) return { allowed: false, reason: `budget_${key}_exceeded` };
    next[key] = remaining[key] - usage[key];
  }
  return { allowed: true, remaining: next };
}

export function canWriteMemoryTier(tier) {
  return tier === "working" || tier === "episodic";
}

export function boundLearningProposal({ key, proposed, min, max, category = "scoring_weight" }) {
  if (category === "hard_gate" || category === "limit" || category === "provider" || category === "payee" || category === "model_version") {
    return { accepted_for_review: false, auto_deploy: false, reason: "human_approval_required" };
  }
  if (typeof proposed !== "number" || !Number.isFinite(proposed) || typeof min !== "number" || typeof max !== "number" || min > max) {
    return { accepted_for_review: false, auto_deploy: false, reason: "invalid_learning_bounds" };
  }
  const value = Math.min(max, Math.max(min, proposed));
  return { accepted_for_review: true, value, auto_deploy: false, clamped: value !== proposed, key };
}

export function validateStageTransition(current, next) {
  const from = STAGES.indexOf(current);
  const to = STAGES.indexOf(next);
  const allowed = from >= 0 && to === from + 1;
  return { allowed, reason: allowed ? "next_stage" : "stage_skip_or_reorder" };
}

export function validateLockOrder(locks) {
  const positions = locks.map(lock => LOCK_ORDER.indexOf(lock));
  const valid = positions.every(x => x >= 0) && positions.every((x, i) => i === 0 || positions[i - 1] < x);
  return { valid, reason: valid ? "ordered" : "lock_order_violation" };
}

export function summarizeLoopOutcome({ interlocksPassed, state }) {
  if (interlocksPassed !== true) return { status: "HALTED_ESCALATE", action: "FAIL_CLOSED" };
  if (state === "UNKNOWN") return { status: "HELD", action: "QUERY_ONLY" };
  return { status: "GOVERNED_CONTINUE", action: "NEXT_APPROVED_STAGE" };
}

export const selfProcessingContract = Object.freeze({
  priorities: [...PRIORITIES],
  stages: [...STAGES],
  memoryWriteTiers: ["working", "episodic"],
  failMode: "closed",
  financialDispatchEnabled: false,
  withdrawalEnabled: false
});
