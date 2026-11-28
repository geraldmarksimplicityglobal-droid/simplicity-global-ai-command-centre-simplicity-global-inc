import test from "node:test";
import assert from "node:assert/strict";
import {
  planAutonomousTask,
  resolveCapability,
  authorizeOperation
} from "../src/autonomy-orchestrator.mjs";

test("reuses a healthy authorized connector without asking the user to reconnect", () => {
  const result = resolveCapability({
    capability: "repository.read",
    connectors: [{ id: "github-main", provider: "github", capabilities: ["repository.read"], status: "healthy", authorized: true }]
  });
  assert.equal(result.status, "ready");
  assert.equal(result.connectorId, "github-main");
  assert.equal(result.requiresUserAction, false);
});

test("does not treat an installed but unauthorized connector as usable", () => {
  const result = resolveCapability({
    capability: "mail.send",
    connectors: [{ id: "mail", provider: "mail", capabilities: ["mail.send"], status: "healthy", authorized: false }]
  });
  assert.equal(result.status, "authorization_required");
  assert.equal(result.requiresUserAction, true);
});

test("reports a missing connector without attempting an unsafe connection", () => {
  const result = resolveCapability({ capability: "calendar.read", connectors: [] });
  assert.equal(result.status, "connector_required");
  assert.equal(result.connectionAttempted, false);
});

test("plans short tasks in foreground and long tasks in background", () => {
  const foreground = planAutonomousTask({ objective: "Inspect repository", estimatedDurationMinutes: 2 });
  const background = planAutonomousTask({ objective: "Run full integration suite", estimatedDurationMinutes: 45 });
  assert.equal(foreground.executionMode, "foreground");
  assert.equal(background.executionMode, "background");
});

test("defaults to foreground when duration is unknown rather than inventing persistence", () => {
  const result = planAutonomousTask({ objective: "Review configuration" });
  assert.equal(result.executionMode, "foreground");
  assert.equal(result.requiresPersistentWorker, false);
});

test("keeps financial, production and destructive actions behind explicit approval", () => {
  for (const risk of ["financial", "production", "destructive"]) {
    const result = authorizeOperation({ risk, operationId: "op-1", requesterId: "user-a" });
    assert.equal(result.allowed, false);
    assert.equal(result.status, "approval_required");
  }
});

test("allows low-risk read-only work without a separate approval", () => {
  const result = authorizeOperation({ risk: "read_only", explicitApproval: false });
  assert.equal(result.allowed, true);
  assert.equal(result.status, "allowed");
});

test("rejects unknown risk classes closed", () => {
  const result = authorizeOperation({ risk: "unclassified", explicitApproval: false });
  assert.equal(result.allowed, false);
  assert.equal(result.status, "denied");
});

test("never elevates connector permissions during capability resolution", () => {
  const result = resolveCapability({
    capability: "payments.transfer",
    connectors: [{ id: "bank", provider: "bank", capabilities: ["payments.read"], status: "healthy", authorized: true }]
  });
  assert.equal(result.status, "connector_required");
  assert.equal(result.permissionEscalation, false);
});

test("does not accept a bare approval boolean for high-impact operations", () => {
  const result = authorizeOperation({ risk: "financial", operationId: "op-2", requesterId: "user-a", explicitApproval: true });
  assert.equal(result.allowed, false);
  assert.equal(result.status, "approval_required");
});

test("rejects caller-constructed approval attestations outside the trusted verifier path", () => {
  const result = authorizeOperation({
    risk: "financial",
    operationId: "op-3",
    requesterId: "user-a",
    verifiedApproval: { verified: true, operationId: "op-3", requesterId: "user-a", approverId: "user-b", approved: true }
  });
  assert.equal(result.allowed, false);
  assert.equal(result.status, "approval_required");
});

test("rejects approval for a different operation or the same requester", () => {
  const wrongOperation = authorizeOperation({
    risk: "production", operationId: "op-4", requesterId: "user-a",
    verifiedApproval: { verified: true, operationId: "other-op", requesterId: "user-a", approverId: "user-b", approved: true }
  });
  const selfApproved = authorizeOperation({
    risk: "production", operationId: "op-4", requesterId: "user-a",
    verifiedApproval: { verified: true, operationId: "op-4", requesterId: "user-a", approverId: "user-a", approved: true }
  });
  assert.equal(wrongOperation.allowed, false);
  assert.equal(selfApproved.allowed, false);
});

test("executes short read-only tasks in foreground using discovered authorized connectors", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let ran = false;
  const result = await executeAutonomousTask({
    objective: "Inspect repository metadata",
    capabilities: ["repository.read"],
    risk: "read_only",
    estimatedDurationMinutes: 2,
    discoverConnectors: async () => [
      { id: "github-main", provider: "github", capabilities: ["repository.read"], status: "healthy", authorized: true }
    ],
    runForeground: async ({ objective, connectorIds }) => {
      ran = true;
      return { objective, connectorIds };
    }
  });
  assert.equal(ran, true);
  assert.equal(result.status, "completed");
  assert.equal(result.executionMode, "foreground");
  assert.deepEqual(result.result.connectorIds, ["github-main"]);
});

test("does not execute when a required connector needs authorization", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let ran = false;
  const result = await executeAutonomousTask({
    objective: "Send a customer email",
    capabilities: ["mail.send"],
    risk: "external_write",
    operationId: "mail-1",
    requesterId: "user-a",
    discoverConnectors: async () => [
      { id: "mail", provider: "mail", capabilities: ["mail.send"], status: "healthy", authorized: false }
    ],
    runForeground: async () => { ran = true; }
  });
  assert.equal(ran, false);
  assert.equal(result.status, "authorization_required");
  assert.equal(result.requiresUserAction, true);
});

test("queues long tasks only when a persistent worker and durable queue adapter exist", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let queued = false;
  const result = await executeAutonomousTask({
    objective: "Run extended integration verification",
    capabilities: ["repository.read"],
    risk: "read_only",
    estimatedDurationMinutes: 60,
    backgroundWorkerAvailable: true,
    discoverConnectors: async () => [
      { id: "github-main", provider: "github", capabilities: ["repository.read"], status: "healthy", authorized: true }
    ],
    enqueueBackground: async payload => {
      queued = true;
      return { jobId: "job-123", acceptedObjective: payload.objective };
    }
  });
  assert.equal(queued, true);
  assert.equal(result.status, "queued");
  assert.equal(result.executionMode, "background");
  assert.equal(result.jobId, "job-123");
});

test("does not pretend to queue background work when no persistent worker exists", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let queued = false;
  const result = await executeAutonomousTask({
    objective: "Run a long report",
    capabilities: [],
    risk: "read_only",
    estimatedDurationMinutes: 90,
    discoverConnectors: async () => [],
    enqueueBackground: async () => { queued = true; }
  });
  assert.equal(queued, false);
  assert.equal(result.status, "background_runtime_required");
});

test("requires host-verified operation-bound independent approval before external writes", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let ran = false;
  const input = {
    objective: "Update provider configuration",
    capabilities: ["provider.config.write"],
    risk: "external_write",
    operationId: "provider-change-7",
    requesterId: "requester-1",
    discoverConnectors: async () => [
      { id: "provider", provider: "provider", capabilities: ["provider.config.write"], status: "healthy", authorized: true }
    ],
    runForeground: async () => { ran = true; }
  };
  const blocked = await executeAutonomousTask(input);
  assert.equal(blocked.status, "approval_required");
  assert.equal(ran, false);
  const approved = await executeAutonomousTask({
    ...input,
    verifyApproval: async request => ({
      verified: true,
      approved: true,
      operationId: request.operationId,
      requesterId: request.requesterId,
      approverId: "reviewer-2"
    })
  });
  assert.equal(approved.status, "completed");
  assert.equal(ran, true);
});


test("requires a trusted approval verifier for high-impact execution", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let ran = false;
  const result = await executeAutonomousTask({
    objective: "Apply production configuration",
    capabilities: ["provider.config.write"],
    risk: "production",
    operationId: "prod-change-1",
    requesterId: "requester-1",
    discoverConnectors: async () => [
      { id: "provider", provider: "provider", capabilities: ["provider.config.write"], status: "healthy", authorized: true }
    ],
    runForeground: async () => { ran = true; },
    approval: { approved: true, operationId: "prod-change-1", approverId: "reviewer-2" }
  });
  assert.equal(result.status, "approval_required");
  assert.equal(ran, false);
});

test("fails closed when the trusted approval verifier throws", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let ran = false;
  const result = await executeAutonomousTask({
    objective: "Apply production configuration",
    capabilities: ["provider.config.write"],
    risk: "production",
    operationId: "prod-change-2",
    requesterId: "requester-1",
    discoverConnectors: async () => [
      { id: "provider", provider: "provider", capabilities: ["provider.config.write"], status: "healthy", authorized: true }
    ],
    verifyApproval: async () => { throw new Error("verifier unavailable"); },
    runForeground: async () => { ran = true; }
  });
  assert.equal(result.status, "approval_required");
  assert.equal(ran, false);
});

test("accepts only a trusted attestation bound to the exact operation and requester", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let verifiedRequest;
  let ran = false;
  const result = await executeAutonomousTask({
    objective: "Apply production configuration",
    capabilities: ["provider.config.write"],
    risk: "production",
    operationId: "prod-change-3",
    requesterId: "requester-1",
    discoverConnectors: async () => [
      { id: "provider", provider: "provider", capabilities: ["provider.config.write"], status: "healthy", authorized: true }
    ],
    verifyApproval: async request => {
      verifiedRequest = request;
      return {
        verified: true,
        approved: true,
        operationId: "prod-change-3",
        requesterId: "requester-1",
        approverId: "reviewer-2"
      };
    },
    runForeground: async () => { ran = true; return { ok: true }; }
  });
  assert.deepEqual(verifiedRequest, {
    operationId: "prod-change-3",
    requesterId: "requester-1",
    risk: "production"
  });
  assert.equal(result.status, "completed");
  assert.equal(ran, true);
});

test("rejects a trusted attestation bound to another requester or operation", async () => {
  const { executeAutonomousTask } = await import("../src/autonomy-orchestrator.mjs");
  let ran = false;
  const result = await executeAutonomousTask({
    objective: "Apply production configuration",
    capabilities: ["provider.config.write"],
    risk: "production",
    operationId: "prod-change-4",
    requesterId: "requester-1",
    discoverConnectors: async () => [
      { id: "provider", provider: "provider", capabilities: ["provider.config.write"], status: "healthy", authorized: true }
    ],
    verifyApproval: async () => ({
      verified: true,
      approved: true,
      operationId: "other-operation",
      requesterId: "other-requester",
      approverId: "reviewer-2"
    }),
    runForeground: async () => { ran = true; }
  });
  assert.equal(result.status, "approval_required");
  assert.equal(ran, false);
});
