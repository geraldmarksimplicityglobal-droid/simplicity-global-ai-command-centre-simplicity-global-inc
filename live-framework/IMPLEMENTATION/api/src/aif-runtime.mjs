import { createHash } from "node:crypto";

const AUTONOMY = Object.freeze({
  L0: 0, "L0.0": 0, "L0.1": 0.1,
  L1: 1, "L1.1": 1.1, "L1.2": 1.2, "L1.3": 1.3,
  L2: 2, "L2.1": 2.1, "L2.2": 2.2, "L2.3": 2.3,
  L3: 3, "L3.1": 3.1, "L3.2": 3.2, "L3.3": 3.3,
  L4: 4, "L4.1": 4.1, "L4.2": 4.2, "L4.3": 4.3, "L4.4": 4.4,
  L5: 5, "L5.1": 5.1, "L5.2": 5.2, "L5.3": 5.3, "L5.4": 5.4
});
const TRANSITIONS = Object.freeze({
  queued: new Set(["inspected", "cancelled"]),
  inspected: new Set(["planned", "cancelled"]),
  planned: new Set(["awaiting_approval", "cancelled"]),
  awaiting_approval: new Set(["approved", "rejected", "cancelled"]),
  approved: new Set(["cancelled"]),
  failed: new Set(["planned", "cancelled"]),
  rejected: new Set(),
  cancelled: new Set()
});
const SECRET_FIELD = /password|secret|token|api[_-]?key|private[_-]?key|seed[_-]?phrase|mnemonic|bank[_-]?account|card[_-]?number|cvv/i;
const MEMORY_TYPES = new Set(["working", "episodic", "semantic", "procedural"]);
const ENVIRONMENTS = new Set(["sandbox", "development", "staging", "production"]);
const RISKS = new Set(["low", "medium", "high", "critical"]);

function requiredText(value, field, max = 5000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new TypeError(field + " must be a non-empty string of at most " + max + " characters");
  }
  return value.trim();
}
function autonomyValue(level) {
  if (typeof level !== "string" || !Object.hasOwn(AUTONOMY, level)) throw new TypeError("invalid autonomy level");
  return AUTONOMY[level];
}
export function assertAutonomyWithinCeiling(level, ceiling) {
  if (autonomyValue(level) > autonomyValue(ceiling)) {
    throw new Error("requested autonomy exceeds the active configuration ceiling");
  }
  return true;
}
function scanForSensitiveFields(value, path = "value") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSensitiveFields(item, path + "[" + index + "]"));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_FIELD.test(key)) throw new TypeError("sensitive field is not permitted in persistent memory");
      scanForSensitiveFields(child, path + "." + key);
    }
  }
}
function stableStringify(value) {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ":" + stableStringify(value[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function validateWorkflowInput(input, requesterId) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("workflow input required");
  const title = requiredText(input.title, "title", 200);
  const objective = requiredText(input.objective, "objective", 4000);
  const environment = input.environment ?? "development";
  if (!ENVIRONMENTS.has(environment)) throw new TypeError("invalid workflow environment");
  const autonomyLevel = input.autonomyLevel ?? "L2.1";
  const autonomy = autonomyValue(autonomyLevel);
  const riskLevel = input.riskLevel ?? "medium";
  if (!RISKS.has(riskLevel)) throw new TypeError("invalid workflow risk level");
  if (environment !== "sandbox" && autonomy > AUTONOMY["L3.3"]) {
    throw new Error("production autonomy ceiling is L3.3 outside the isolated sandbox");
  }
  const simulationOnly = input.simulationOnly === true;
  if (environment === "sandbox" && autonomy > AUTONOMY["L3.3"] && !simulationOnly) {
    throw new Error("sandbox autonomy above L3.3 must be simulation-only");
  }
  if (simulationOnly && environment !== "sandbox") {
    throw new Error("simulation-only workflows must use the sandbox environment");
  }
  if (typeof requesterId !== "string" || !requesterId.trim()) throw new TypeError("requester identity required");
  const idempotencyKey = input.idempotencyKey == null ? null : requiredText(input.idempotencyKey, "idempotencyKey", 200);
  return Object.freeze({
    title, objective, environment, autonomyLevel, riskLevel, simulationOnly,
    requesterId: requesterId.trim(), idempotencyKey
  });
}

export function assertWorkflowTransition(currentStatus, nextStatus, {
  requesterId, actorId, riskLevel = "medium", environment = "development", simulationOnly = false
} = {}) {
  if (!TRANSITIONS[currentStatus]?.has(nextStatus)) throw new Error("invalid workflow transition");
  if (typeof actorId !== "string" || !actorId.trim()) throw new TypeError("actor identity required");
  if (nextStatus === "approved" && (!requesterId || actorId === requesterId)) {
    throw new Error("approval requires reviewer/requester separation");
  }
  return true;
}

export function validateMemoryRecord(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("memory record required");
  if (!MEMORY_TYPES.has(input.memoryType)) throw new TypeError("unsupported memory type");
  const memoryKey = requiredText(input.memoryKey, "memoryKey", 200);
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) {
    throw new TypeError("memory value must be a JSON object");
  }
  scanForSensitiveFields(input.value);
  const encoded = JSON.stringify(input.value);
  if (Buffer.byteLength(encoded, "utf8") > 64 * 1024) throw new RangeError("memory value exceeds 64 KB");
  const classification = input.classification ?? "internal";
  if (!["internal", "confidential"].includes(classification)) throw new TypeError("unsupported memory classification");
  const ttlDays = input.ttlDays ?? 30;
  if (!Number.isInteger(ttlDays) || ttlDays < 1 || ttlDays > 365) throw new RangeError("ttlDays must be between 1 and 365");
  const sourceReference = input.sourceReference == null ? null : requiredText(input.sourceReference, "sourceReference", 500);
  return Object.freeze({ memoryType: input.memoryType, memoryKey, value: JSON.parse(encoded), classification, ttlDays, sourceReference });
}

export function validateAifConfiguration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("configuration object required");
  const allowedKeys = new Set(["runtimeMode","maxProductionAutonomy","sandboxMaxAutonomy","memoryRetentionDays","maxWorkflowConcurrency","financialExecutionEnabled","providerWritesEnabled","productionDeploymentEnabled","selfEscalationEnabled"]);
  if (Object.keys(input).some(key => !allowedKeys.has(key))) throw new TypeError("configuration contains an unsupported key");
  if (input.financialExecutionEnabled === true || input.providerWritesEnabled === true ||
      input.productionDeploymentEnabled === true || input.selfEscalationEnabled === true) {
    throw new Error("financial execution, provider writes, production deployment and self-escalation are not configurable");
  }
  const runtimeMode = input.runtimeMode ?? "read_only";
  if (!["read_only", "simulation"].includes(runtimeMode)) throw new TypeError("runtimeMode must be read_only or simulation");
  const maxProductionAutonomy = input.maxProductionAutonomy ?? "L3.3";
  if (autonomyValue(maxProductionAutonomy) > AUTONOMY["L3.3"]) throw new Error("production autonomy ceiling is L3.3");
  const sandboxMaxAutonomy = input.sandboxMaxAutonomy ?? "L5.4";
  if (autonomyValue(sandboxMaxAutonomy) > AUTONOMY["L5.4"]) throw new Error("sandbox autonomy ceiling is L5.4");
  const memoryRetentionDays = input.memoryRetentionDays ?? 30;
  if (!Number.isInteger(memoryRetentionDays) || memoryRetentionDays < 1 || memoryRetentionDays > 365) {
    throw new RangeError("memoryRetentionDays must be between 1 and 365");
  }
  const maxWorkflowConcurrency = input.maxWorkflowConcurrency ?? 2;
  if (!Number.isInteger(maxWorkflowConcurrency) || maxWorkflowConcurrency < 1 || maxWorkflowConcurrency > 10) {
    throw new RangeError("maxWorkflowConcurrency must be between 1 and 10");
  }
  return Object.freeze({
    runtimeMode, maxProductionAutonomy, sandboxMaxAutonomy, memoryRetentionDays,
    maxWorkflowConcurrency, financialExecutionEnabled: false, providerWritesEnabled: false,
    productionDeploymentEnabled: false, selfEscalationEnabled: false
  });
}

export function buildFinancialRouteDecision(input, { mandate = null, killSwitchActive = true } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("route request required");
  const requestReference = requiredText(input.requestReference, "requestReference", 200);
  const amountMinor = String(input.amountMinor ?? "");
  if (!/^[1-9][0-9]{0,37}$/.test(amountMinor)) throw new TypeError("amountMinor must be a positive integer string");
  if (typeof input.currency !== "string" || !/^[A-Z]{3}$/.test(input.currency)) throw new TypeError("currency must be an ISO-4217 code");
  const corridor = requiredText(input.corridor, "corridor", 80);
  if (!Array.isArray(input.candidateRoutes) || input.candidateRoutes.length > 50) throw new TypeError("candidateRoutes must be an array of at most 50 entries");
  const suppliedGates = input.hardGates && typeof input.hardGates === "object" && !Array.isArray(input.hardGates)
    ? input.hardGates : {};
  const requiredGates = ["sanctions", "aml", "beneficiary", "currency", "corridor", "jurisdiction", "approval", "idempotency"];
  const hardGates = Object.fromEntries(requiredGates.map(key => [key, suppliedGates[key] === true]));
  const failedGates = requiredGates.filter(key => hardGates[key] !== true);
  const blockReasons = [];
  if (!mandate || !Array.isArray(mandate.counterpartyAllowlist) || mandate.counterpartyAllowlist.length === 0 ||
      !Array.isArray(mandate.railAllowlist) || mandate.railAllowlist.length === 0 ||
      !mandate.amountCapPerTransactionMinor) blockReasons.push("mandate-not-configured");
  if (failedGates.length) blockReasons.push("hard-gates-incomplete:" + failedGates.join(","));
  if (killSwitchActive) blockReasons.push("freeze-or-kill-switch-active");
  const routes = input.candidateRoutes.map(route => {
    if (!route || typeof route !== "object" || typeof route.routeId !== "string" || !route.routeId.trim()) {
      throw new TypeError("each candidate route requires a routeId");
    }
    return { routeId: route.routeId.trim(), rail: typeof route.rail === "string" ? route.rail.slice(0, 80) : null };
  });
  return Object.freeze({
    requestReference, amountMinor, currency: input.currency, corridor,
    candidateRoutes: Object.freeze(routes), hardGates: Object.freeze({ ...hardGates }),
    status: blockReasons.length ? "blocked" : "recommendation",
    blockReasons: Object.freeze(blockReasons), selectedRoute: null, executionAllowed: false
  });
}

export function hashWorkflowEvent(event, previousHash = "") {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new TypeError("workflow event required");
  return createHash("sha256").update(String(previousHash) + "\n" + stableStringify(event)).digest("hex");
}
