import test from "node:test";
import assert from "node:assert/strict";
import { validateInvocation, createAdapterRegistry } from "../src/runtime-policy.mjs";

const policy = {
  adapters: [{ id: "git", executable: "/usr/bin/git", operations: ["status", "commit"] }],
  workspaceRoots: ["/workspace/project"],
  approvalRequiredOperations: ["commit"],
  allowedEnvironment: ["LANG"],
  maxTimeoutMs: 60000,
  maxOutputBytes: 100000
};

function request(overrides = {}) {
  return {
    taskId: "task-1",
    adapterId: "git",
    operation: "status",
    executable: "/usr/bin/git",
    args: ["status", "--short"],
    workingDirectory: "/workspace/project",
    ...overrides
  };
}

test("accepts an allowlisted invocation and forces shell off", () => {
  const result = validateInvocation(request(), policy);
  assert.equal(result.shell, false);
  assert.deepEqual(result.args, ["status", "--short"]);
});

test("rejects unknown adapter, executable and operation combinations", () => {
  assert.throws(() => validateInvocation(request({ executable: "/bin/sh" }), policy), /not allowlisted/);
  assert.throws(() => validateInvocation(request({ operation: "push" }), policy), /not allowlisted/);
});

test("rejects workspace path traversal and unrelated directories", () => {
  assert.throws(() => validateInvocation(request({ workingDirectory: "/workspace/project/../../etc" }), policy), /outside approved/);
  assert.throws(() => validateInvocation(request({ workingDirectory: "/workspace/project-evil" }), policy), /outside approved/);
});

test("requires a current task- and operation-scoped approval for protected operations", () => {
  const protectedRequest = request({
    operation: "commit",
    approval: {
      status: "approved",
      taskId: "task-1",
      operations: ["commit"],
      expiresAt: Date.now() + 60000
    }
  });
  assert.equal(validateInvocation(protectedRequest, policy).operation, "commit");
  assert.throws(() => validateInvocation(request({
    operation: "commit",
    approval: { status: "approved", taskId: "other-task", operations: ["commit"], expiresAt: Date.now() + 60000 }
  }), policy), /approval is required/);
  assert.throws(() => validateInvocation(request({
    operation: "commit",
    approval: { status: "approved", taskId: "task-1", operations: ["commit"] }
  }), policy), /approval is required/);
});

test("rejects unsafe environment variables and malformed arguments", () => {
  assert.throws(() => validateInvocation(request({ environment: { PATH: "/tmp" } }), policy), /not permitted/);
  assert.throws(() => validateInvocation(request({ environment: { LANG: "en", NODE_OPTIONS: "--require=x" } }), policy), /not permitted/);
  assert.throws(() => validateInvocation(request({ args: ["ok", 42] }), policy), /bounded array/);
});

test("enforces timeout and output bounds", () => {
  assert.throws(() => validateInvocation(request({ timeoutMs: 999999 }), policy), /timeout/);
  assert.throws(() => validateInvocation(request({ maxOutputBytes: 999999 }), policy), /output limit/);
});

test("registry rejects duplicate adapter identities", () => {
  assert.throws(() => createAdapterRegistry([
    { id: "git", executable: "git", operations: ["status"] },
    { id: "git", executable: "git", operations: ["log"] }
  ]), /duplicate adapter/);
});
