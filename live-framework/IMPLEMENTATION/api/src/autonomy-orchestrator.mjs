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
export function authorizeOperation({ risk, operationId, requesterId, verifiedApproval = null } = {}) {
  if (typeof risk !== "string" || !RISKS.has(risk)) {
    return Object.freeze({ allowed: false, status: "denied", reason: "unknown-risk-class" });
  }
  if (risk === "read_only" || risk === "reversible") {
    return Object.freeze({ allowed: true, status: "allowed", reason: "within-default-autonomy" });
  }
  const hasVerifiedApproval = verifiedApproval && typeof verifiedApproval === "object" &&
    verifiedApproval.verified === true &&
    verifiedApproval.approved === true &&
    typeof operationId === "string" && operationId.trim() &&
    verifiedApproval.operationId === operationId &&
    typeof requesterId === "string" && requesterId.trim() &&
    verifiedApproval.requesterId === requesterId &&
    typeof verifiedApproval.approverId === "string" && verifiedApproval.approverId.trim() &&
    verifiedApproval.approverId !== requesterId;
  if (hasVerifiedApproval) {
    return Object.freeze({ allowed: true, status: "approved", reason: "host-verified-operation-bound-independent-approval" });
  }
  return Object.freeze({ allowed: false, status: "approval_required", reason: "trusted-operation-specific-approval-verification-required" });
}


/**
 * Execute a one-command task through trusted runtime adapters.
 *
 * Discovery is automatic, but connector installation/OAuth is never initiated
 * here. Foreground execution requires an injected executor. Background work is
 * queued only when both an explicitly healthy persistent worker and a durable
 * queue adapter are supplied by the host runtime.
 */
export async function executeAutonomousTask({
  objective,
  capabilities = [],
  risk = "read_only",
  operationId,
  requesterId,
  verifyApproval,
  estimatedDurationMinutes,
  requestedMode,
  backgroundWorkerAvailable = false,
  backgroundThresholdMinutes = DEFAULT_BACKGROUND_THRESHOLD_MINUTES,
  discoverConnectors,
  runForeground,
  enqueueBackground
} = {}) {
  const taskObjective = nonEmpty(objective, "objective", 4000);
  if (!Array.isArray(capabilities) || capabilities.length > 100) {
    throw new TypeError("capabilities must be an array of at most 100 entries");
  }
  const requestedCapabilities = [...new Set(capabilities.map(value =>
    nonEmpty(value, "capability", 200)
  ))];
  if (typeof discoverConnectors !== "function") {
    throw new TypeError("discoverConnectors adapter is required");
  }

  let connectors;
  try {
    connectors = await discoverConnectors();
  } catch {
    return Object.freeze({
      status: "failed",
      stage: "connector_discovery",
      reason: "connector_discovery_failed",
      requiresUserAction: false
    });
  }
  if (!Array.isArray(connectors)) {
    return Object.freeze({
      status: "failed",
      stage: "connector_discovery",
      reason: "invalid_connector_inventory",
      requiresUserAction: false
    });
  }

  const resolutions = requestedCapabilities.map(capability =>
    resolveCapability({ capability, connectors })
  );
  const blocked = resolutions.find(item => item.status !== "ready");
  if (blocked) {
    return Object.freeze({
      status: blocked.status,
      stage: "capability_resolution",
      capability: blocked.capability,
      requiresUserAction: true,
      connectionAttempted: false,
      permissionEscalation: false,
      capabilityResolutions: Object.freeze(resolutions)
    });
  }

  let verifiedApproval = null;
  if (risk !== "read_only" && risk !== "reversible" && RISKS.has(risk) &&
      typeof verifyApproval === "function") {
    try {
      verifiedApproval = await verifyApproval({ operationId, requesterId, risk });
    } catch {
      verifiedApproval = null;
    }
  }
  const authorization = authorizeOperation({ risk, operationId, requesterId, verifiedApproval });
  if (!authorization.allowed) {
    return Object.freeze({
      status: authorization.status,
      stage: "authorization",
      reason: authorization.reason,
      requiresUserAction: true,
      capabilityResolutions: Object.freeze(resolutions)
    });
  }

  const workerReady = backgroundWorkerAvailable === true && typeof enqueueBackground === "function";
  const plan = planAutonomousTask({
    objective: taskObjective,
    estimatedDurationMinutes,
    backgroundThresholdMinutes,
    backgroundWorkerAvailable: workerReady,
    requestedMode
  });
  const connectorIds = resolutions.map(item => item.connectorId);

  if (plan.executionMode === "background") {
    if (!workerReady) {
      return Object.freeze({
        status: "background_runtime_required",
        stage: "execution_planning",
        executionMode: "background",
        requiresPersistentWorker: true,
        requiresUserAction: true,
        note: "A persistent worker and durable queue must be provisioned before background execution.",
        capabilityResolutions: Object.freeze(resolutions)
      });
    }
    try {
      const queued = await enqueueBackground({
        objective: taskObjective,
        capabilities: requestedCapabilities,
        connectorIds,
        risk,
        operationId: operationId ?? null,
        requesterId: requesterId ?? null
      });
      if (!queued || typeof queued.jobId !== "string" || !queued.jobId.trim()) {
        return Object.freeze({
          status: "failed",
          stage: "background_enqueue",
          reason: "queue_did_not_return_job_id",
          executionMode: "background"
        });
      }
      return Object.freeze({
        status: "queued",
        executionMode: "background",
        jobId: queued.jobId,
        requiresPersistentWorker: true,
        capabilityResolutions: Object.freeze(resolutions)
      });
    } catch {
      return Object.freeze({
        status: "failed",
        stage: "background_enqueue",
        reason: "background_enqueue_failed",
        executionMode: "background"
      });
    }
  }

  if (typeof runForeground !== "function") {
    return Object.freeze({
      status: "foreground_executor_required",
      stage: "execution",
      executionMode: "foreground",
      requiresUserAction: true,
      capabilityResolutions: Object.freeze(resolutions)
    });
  }
  try {
    const result = await runForeground({
      objective: taskObjective,
      capabilities: requestedCapabilities,
      connectorIds,
      risk,
      operationId: operationId ?? null,
      requesterId: requesterId ?? null
    });
    return Object.freeze({
      status: "completed",
      executionMode: "foreground",
      result,
      capabilityResolutions: Object.freeze(resolutions)
    });
  } catch {
    return Object.freeze({
      status: "failed",
      stage: "foreground_execution",
      reason: "foreground_execution_failed",
      executionMode: "foreground"
    });
  }
}
