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
    const result = authorizeOperation({ risk, explicitApproval: false });
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
