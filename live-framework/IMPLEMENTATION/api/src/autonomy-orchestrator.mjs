const EXECUTION_MODES = new Set(["foreground", "background"]);
const RISKS = new Set(["read_only", "reversible", "external_write", "financial", "production", "destructive"]);
const DEFAULT_BACKGROUND_THRESHOLD_MINUTES = 15;

function nonEmpty(value, field, max = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new TypeError(field + " must be a non-empty string of at most " + max + " characters");
  }
  return value.trim();
}

function safeConnectorSummary(connector) {
  return {
    id: connector.id,
    provider: connector.provider,
    status: connector.status,
    authorized: connector.authorized === true
  };
}

/**
 * Resolve a requested capability against already-discovered connectors.
 * This function never initiates OAuth, installs plugins, requests scopes or reads secrets.
 */
export function resolveCapability({ capability, connectors = [] } = {}) {
  const requested = nonEmpty(capability, "capability", 200);
  if (!Array.isArray(connectors)) throw new TypeError("connectors must be an array");

  const candidates = connectors.filter(item =>
    item && typeof item === "object" &&
    Array.isArray(item.capabilities) &&
    item.capabilities.includes(requested)
  );

  const ready = candidates.find(item =>
    item.status === "healthy" && item.authorized === true
  );
  if (ready) {
    return Object.freeze({
      capability: requested,
      status: "ready",
      connectorId: nonEmpty(ready.id, "connector.id", 200),
      provider: nonEmpty(ready.provider, "connector.provider", 200),
      requiresUserAction: false,
      connectionAttempted: false,
      permissionEscalation: false
    });
  }

  const authorizationNeeded = candidates.some(item =>
    item.status !== "disabled" && item.authorized !== true
  );
  if (authorizationNeeded) {
    return Object.freeze({
      capability: requested,
      status: "authorization_required",
      requiresUserAction: true,
      connectionAttempted: false,
      permissionEscalation: false,
      candidates: Object.freeze(candidates.map(safeConnectorSummary))
    });
  }

  return Object.freeze({
    capability: requested,
    status: "connector_required",
    requiresUserAction: true,
    connectionAttempted: false,
    permissionEscalation: false,
    candidates: Object.freeze(candidates.map(safeConnectorSummary))
  });
}

/**
 * Produce a deterministic execution-mode recommendation.
 * This is a plan, not a worker launch or durable queue operation.
 */
export function planAutonomousTask({
  objective,
  estimatedDurationMinutes,
  backgroundThresholdMinutes = DEFAULT_BACKGROUND_THRESHOLD_MINUTES,
  backgroundWorkerAvailable = false,
  requestedMode
} = {}) {
  const taskObjective = nonEmpty(objective, "objective", 4000);
  if (!Number.isFinite(backgroundThresholdMinutes) || backgroundThresholdMinutes < 1) {
    throw new RangeError("backgroundThresholdMinutes must be a positive number");
  }
  if (estimatedDurationMinutes !== undefined &&
      (!Number.isFinite(estimatedDurationMinutes) || estimatedDurationMinutes < 0)) {
    throw new RangeError("estimatedDurationMinutes must be a non-negative number");
  }
  if (requestedMode !== undefined && !EXECUTION_MODES.has(requestedMode)) {
    throw new TypeError("requestedMode must be foreground or background");
  }

  const inferredMode = estimatedDurationMinutes !== undefined &&
    estimatedDurationMinutes >= backgroundThresholdMinutes ? "background" : "foreground";
  const executionMode = requestedMode || inferredMode;
  const requiresPersistentWorker = executionMode === "background";
  return Object.freeze({
    objective: taskObjective,
    executionMode,
    estimatedDurationMinutes: estimatedDurationMinutes ?? null,
    requiresPersistentWorker,
    persistentWorkerAvailable: backgroundWorkerAvailable === true,
    canRunInCurrentProcess: executionMode === "foreground",
    status: requiresPersistentWorker && backgroundWorkerAvailable !== true
      ? "background_runtime_required"
      : "planned",
    note: requiresPersistentWorker && backgroundWorkerAvailable !== true
      ? "A persistent worker and durable queue must be provisioned before background execution."
      : "Execution mode selected; this planner does not launch jobs."
  });
}

/**
 * Fail-closed operation gate. Only read-only and reversible internal work
 * are permitted without an operation-specific approval.
 */
export function authorizeOperation({ risk, operationId, requesterId, approval = null } = {}) {
  if (typeof risk !== "string" || !RISKS.has(risk)) {
    return Object.freeze({ allowed: false, status: "denied", reason: "unknown-risk-class" });
  }
  if (risk === "read_only" || risk === "reversible") {
    return Object.freeze({ allowed: true, status: "allowed", reason: "within-default-autonomy" });
  }
  const hasBoundApproval = approval && typeof approval === "object" &&
    approval.approved === true &&
    typeof operationId === "string" && operationId.trim() &&
    approval.operationId === operationId &&
    typeof requesterId === "string" && requesterId.trim() &&
    typeof approval.approverId === "string" && approval.approverId.trim() &&
    approval.approverId !== requesterId;
  if (hasBoundApproval) {
    return Object.freeze({ allowed: true, status: "approved", reason: "operation-bound-independent-approval" });
  }
  return Object.freeze({ allowed: false, status: "approval_required", reason: "operation-specific-independent-approval-required" });
}
