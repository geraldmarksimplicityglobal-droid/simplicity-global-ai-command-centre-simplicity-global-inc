import { createHash } from "node:crypto";

const TERMINAL_AUTOMATION_STATES = new Set(["UNKNOWN", "SETTLED", "FAILED", "RETURNED", "CLOSED"]);
const REQUIRED_DECISION_FIELDS = ["decision_id", "approval_token", "policy_version", "intent_hash", "valid_until"];

export function canonicalIntent(intent) {
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) throw new TypeError("intent must be an object");
  const fields = ["request_id", "amount_minor", "currency", "payee_id", "rail"];
  for (const field of fields) {
    if (intent[field] === undefined || intent[field] === null || intent[field] === "") throw new Error(`missing intent field: ${field}`);
  }
  if (!Number.isSafeInteger(intent.amount_minor) || intent.amount_minor <= 0) throw new Error("amount_minor must be a positive safe integer");
  if (!/^[A-Z]{3}$/.test(intent.currency)) throw new Error("currency must be an uppercase ISO 4217 code");
  return Object.fromEntries(fields.map((key) => [key, intent[key]]));
}

export function intentHash(intent) {
  return createHash("sha256").update(JSON.stringify(canonicalIntent(intent))).digest("hex");
}

export function idempotencyKey(intent) {
  return intentHash(intent);
}

export function validateDecisionBinding({ intent, decision, activePolicyVersion, now = Date.now(), usedDecisionIds = new Set() }) {
  const errors = [];
  if (!decision || typeof decision !== "object") return { allowed: false, errors: ["decision_missing"] };
  for (const field of REQUIRED_DECISION_FIELDS) if (!decision[field]) errors.push(`decision_${field}_missing`);
  if (decision.allow !== true) errors.push("policy_denied");
  if (decision.policy_version !== activePolicyVersion) errors.push("policy_version_mismatch");
  try {
    if (decision.intent_hash !== intentHash(intent)) errors.push("intent_hash_mismatch");
  } catch (error) {
    errors.push("intent_invalid");
  }
  const expiry = Date.parse(decision.valid_until);
  if (!Number.isFinite(expiry) || expiry <= now) errors.push("decision_expired");
  if (decision.decision_id && usedDecisionIds.has(decision.decision_id)) errors.push("decision_replayed");
  if (decision.constraints?.rail_locked && decision.constraints.rail_locked !== intent?.rail) errors.push("rail_lock_mismatch");
  if (Number.isSafeInteger(decision.constraints?.max_amount_minor) && intent?.amount_minor > decision.constraints.max_amount_minor) errors.push("amount_cap_exceeded");
  return { allowed: errors.length === 0, errors };
}

export function nextPaymentState(current, event) {
  if (current === "UNKNOWN") return { state: "UNKNOWN", action: "QUERY_ONLY" };
  const transitions = {
    CREATED: { VALIDATED: "VALIDATED" },
    VALIDATED: { SCREENED: "SCREENED" },
    SCREENED: { MANDATE_OK: "MANDATE_OK" },
    MANDATE_OK: { APPROVED: "APPROVED" },
    APPROVED: { SENT: "SENT" },
    SENT: { PENDING: "PENDING", UNKNOWN: "UNKNOWN", FAILED: "FAILED" },
    PENDING: { SETTLED: "SETTLED", FAILED: "FAILED", RETURNED: "RETURNED", UNKNOWN: "UNKNOWN" },
    SETTLED: { RECONCILED: "RECONCILED" },
    RECONCILED: { CLOSED: "CLOSED" }
  };
  const next = transitions[current]?.[event];
  if (!next) throw new Error(`invalid payment transition: ${current} -> ${event}`);
  return { state: next, action: next === "UNKNOWN" ? "QUERY_ONLY" : "CONTINUE_GOVERNED_FLOW" };
}

export function classifyRailOutcome({ responseReceived, providerStatus }) {
  if (!responseReceived) return { state: "UNKNOWN", retry: false, action: "QUERY_ONLY" };
  if (providerStatus === "SETTLED") return { state: "SETTLED", retry: false, action: "RECONCILE" };
  if (providerStatus === "PENDING") return { state: "PENDING", retry: false, action: "POLL_STATUS" };
  if (providerStatus === "DECLINED") return { state: "FAILED", retry: false, action: "MANUAL_OR_POLICY_REVIEW" };
  return { state: "UNKNOWN", retry: false, action: "QUERY_ONLY" };
}

export function verifyWebhookEnvelope({ signatureValid, timestamp, now = Date.now(), replayWindowSeconds = 300, eventId, seenEventIds = new Set() }) {
  if (signatureValid !== true) return { accepted: false, reason: "signature_invalid" };
  const eventTime = Date.parse(timestamp);
  if (!Number.isFinite(eventTime) || Math.abs(now - eventTime) > replayWindowSeconds * 1000) return { accepted: false, reason: "timestamp_outside_replay_window" };
  if (!eventId || seenEventIds.has(eventId)) return { accepted: false, reason: "duplicate_or_missing_event_id" };
  return { accepted: true, reason: "verified_envelope_only" };
}

export function assertNoExecutionCapability(connectorDescriptor) {
  if (connectorDescriptor?.executionEnabled === true || connectorDescriptor?.withdrawalEnabled === true) {
    throw new Error("this runtime package is proposal-only; external execution capabilities are prohibited");
  }
  return true;
}

export const terminalAutomationStates = [...TERMINAL_AUTOMATION_STATES];
