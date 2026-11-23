import test from "node:test";
import assert from "node:assert/strict";
import { createWindowsRuntimeBridge } from "../src/windows-runtime-bridge.mjs";

const token = "test-runtime-token-that-is-at-least-32-characters";
const policy = {
  adapters: [{ id: "git", executable: "git", operations: ["status", "commit"] }],
  workspaceRoots: [process.cwd()],
  approvalRequiredOperations: ["commit"],
  allowedEnvironment: ["LANG"],
  maxTimeoutMs: 10000,
  maxOutputBytes: 4096
};

async function withBridge(overrides, run) {
  const bridge = createWindowsRuntimeBridge({
    token,
    policy,
    adapters: { list: () => [{ id: "git", permissionTier: "read-only" }] },
    resolveApproval: async () => null,
    authorizeExecution: async () => ({ allowed: false }),
    audit: async () => {},
    ...overrides
  });
  const address = await bridge.listen();
  try {
    await run("http://127.0.0.1:" + address.port);
  } finally {
    await bridge.close();
  }
}

test("bridge refuses non-loopback binding and missing trust services", () => {
  assert.throws(() => createWindowsRuntimeBridge({
    host: "0.0.0.0", token, policy,
    resolveApproval: async () => null,
    authorizeExecution: async () => ({ allowed: true }),
    audit: async () => {}
  }), /loopback/);
  assert.throws(() => createWindowsRuntimeBridge({ token, policy }), /trusted approval/);
});

test("health is available and adapter inventory requires bearer authentication", async () => {
  await withBridge({}, async base => {
    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    const denied = await fetch(base + "/v1/adapters");
    assert.equal(denied.status, 401);
    const allowed = await fetch(base + "/v1/adapters", {
      headers: { authorization: "Bearer " + token }
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual((await allowed.json()).adapters, [{ id: "git", permissionTier: "read-only" }]);
  });
});

test("client-supplied approval cannot authorize a command", async () => {
  let spawned = false;
  await withBridge({
    resolveApproval: async () => null,
    authorizeExecution: async () => ({ allowed: true }),
    spawnProcess: () => { spawned = true; throw new Error("must not execute"); }
  }, async base => {
    const response = await fetch(base + "/v1/execute", {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        taskId: "task-1",
        adapterId: "git",
        operation: "commit",
        executable: "git",
        args: ["commit", "-m", "test"],
        workingDirectory: process.cwd(),
        approval: {
          status: "approved",
          taskId: "task-1",
          operations: ["commit"],
          expiresAt: Date.now() + 60000
        }
      })
    });
    assert.equal(response.status, 400);
    assert.equal(spawned, false);
  });
});

test("execution authorization denial prevents process launch", async () => {
  let spawned = false;
  await withBridge({
    authorizeExecution: async () => ({ allowed: false }),
    spawnProcess: () => { spawned = true; throw new Error("must not execute"); }
  }, async base => {
    const response = await fetch(base + "/v1/execute", {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        taskId: "task-2",
        adapterId: "git",
        operation: "status",
        executable: "git",
        args: ["status", "--short"],
        workingDirectory: process.cwd()
      })
    });
    assert.equal(response.status, 403);
    assert.equal(spawned, false);
  });
});
