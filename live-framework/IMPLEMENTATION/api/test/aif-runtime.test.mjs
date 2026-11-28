import test from "node:test";
import assert from "node:assert/strict";
import {
  validateWorkflowInput, assertWorkflowTransition, validateMemoryRecord,
  validateAifConfiguration, assertAutonomyWithinCeiling, buildFinancialRouteDecision, hashWorkflowEvent
} from "../src/aif-runtime.mjs";

test("production workflows cannot exceed L3.3", () => {
  assert.equal(validateWorkflowInput({
    title: "Read-only inventory", objective: "Inspect approved service metadata",
    environment: "production", autonomyLevel: "L3.3", riskLevel: "low"
  }, "user-1").autonomyLevel, "L3.3");
  assert.throws(() => validateWorkflowInput({
    title: "Unbounded task", objective: "Run unrestricted actions",
    environment: "production", autonomyLevel: "L4.1", riskLevel: "high"
  }, "user-1"), /production autonomy ceiling/);
});

test("L5 sandbox workflows must be explicitly simulation-only", () => {
  assert.throws(() => validateWorkflowInput({
    title: "Sandbox simulation", objective: "Replay a test workflow",
    environment: "sandbox", autonomyLevel: "L5.4", riskLevel: "low"
  }, "user-1"), /simulation-only/);
  const task = validateWorkflowInput({
    title: "Sandbox simulation", objective: "Replay a test workflow",
    environment: "sandbox", autonomyLevel: "L5.4", simulationOnly: true,
    riskLevel: "low"
  }, "user-1");
  assert.equal(task.simulationOnly, true);
});

test("workflow transitions are constrained and high-risk approval separates requester", () => {
  assert.equal(assertWorkflowTransition("queued", "inspected", {
    requesterId: "user-1", actorId: "user-1", riskLevel: "low"
  }), true);
  assert.throws(() => assertWorkflowTransition("queued", "approved", {
    requesterId: "user-1", actorId: "reviewer-2", riskLevel: "low"
  }), /invalid workflow transition/);
  assert.throws(() => assertWorkflowTransition("awaiting_approval", "approved", {
    requesterId: "user-1", actorId: "user-1", riskLevel: "critical"
  }), /reviewer/requester separation/);
  assert.equal(assertWorkflowTransition("awaiting_approval", "approved", {
    requesterId: "user-1", actorId: "reviewer-2", riskLevel: "critical"
  }), true);
  assert.throws(() => assertWorkflowTransition("approved", "executing", {
    requesterId: "user-1", actorId: "executor-3", riskLevel: "low"
  }), /invalid workflow transition/);
});

test("persistent memory rejects secret-bearing fields and oversized payloads", () => {
  assert.throws(() => validateMemoryRecord({
    memoryType: "semantic", memoryKey: "provider", value: { api_key: "do-not-store" }
  }), /sensitive field/);
  assert.throws(() => validateMemoryRecord({
    memoryType: "semantic", memoryKey: "large", value: { text: "x".repeat(70000) }
  }), /64 KB/);
  const record = validateMemoryRecord({
    memoryType: "episodic", memoryKey: "deployment-checkpoint",
    value: { outcome: "tests-passed" }, classification: "internal", ttlDays: 30
  });
  assert.equal(record.ttlDays, 30);
});

test("configuration cannot raise autonomy or enable financial execution", () => {
  assert.throws(() => validateAifConfiguration({
    runtimeMode: "production", maxProductionAutonomy: "L4.1"
  }), /production autonomy ceiling/);
  assert.throws(() => validateAifConfiguration({
    runtimeMode: "read_only", financialExecutionEnabled: true
  }), /financial execution is not configurable/);
  const config = validateAifConfiguration({
    runtimeMode: "read_only", maxProductionAutonomy: "L3.3",
    sandboxMaxAutonomy: "L5.4", memoryRetentionDays: 90
  });
  assert.equal(config.financialExecutionEnabled, false);
});

test("financial route proposals fail closed when mandate or hard gates are missing", () => {
  const decision = buildFinancialRouteDecision({
    requestReference: "invoice-100", amountMinor: "100000",
    currency: "ZAR", corridor: "ZA-ZA",
    candidateRoutes: [{ routeId: "bank-rail-a", rail: "eft" }],
    hardGates: { sanctions: true, aml: true, beneficiary: true }
  });
  assert.equal(decision.status, "blocked");
  assert.equal(decision.executionAllowed, false);
  assert.equal(decision.selectedRoute, null);
  assert.match(decision.blockReasons.join(","), /mandate-not-configured/);
});

test("workflow event hash is deterministic and chained to previous hash", () => {
  const event = { workflowId: "w-1", sequence: 1, eventType: "workflow.created", actorId: "u-1" };
  const first = hashWorkflowEvent(event);
  assert.equal(first, hashWorkflowEvent(event));
  assert.notEqual(first, hashWorkflowEvent(event, "previous-hash"));
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("API integration keeps AIF routes behind scoped permissions and has no execution endpoint", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  const routes = await readFile(new URL("../src/aif-routes.js", import.meta.url), "utf8");
  assert.match(source, /registerAifRoutes/);
  assert.match(routes, /aif:read/);
  assert.match(routes, /financial-routing:prepare/);
  assert.doesNotMatch(routes, /payments\.execute_approved/);
});

test("activated autonomy ceilings can tighten but never exceed the global production cap", () => {
  assert.equal(assertAutonomyWithinCeiling("L3.2", "L3.3"), true);
  assert.throws(() => assertAutonomyWithinCeiling("L3.3", "L2.3"), /active configuration ceiling/);
  assert.throws(() => assertAutonomyWithinCeiling("L4.1", "L3.3"), /active configuration ceiling/);
});

test("runtime configuration rejects unknown fields rather than silently ignoring them", () => {
  assert.throws(() => validateAifConfiguration({
    runtimeMode: "read_only", bankTransferEnabled: true
  }), /unsupported key/);
});
