import test from "node:test";
import assert from "node:assert/strict";
import { runExecutionWorkerOnce, startExecutionWorker } from "../src/execution-worker.mjs";

test("worker claims, executes and completes one job through tenant-scoped adapters", async () => {
  const calls = [];
  const withTenantClient = async (org, fn) => {
    calls.push(["tenant", org]);
    return fn({ query: async sql => {
      calls.push(["query", sql]);
      if (sql.includes("WITH candidate")) return { rows: [{
        id: "job-1", organisation_id: org, requester_user_id: "user-1",
        payload: { objective: "Read repo", capabilities: ["repository.read"], risk: "read_only" },
        attempts: 1
      }] };
      if (sql.includes("UPDATE aif_execution_jobs")) return { rows: [{ id: "job-1", status: "succeeded" }] };
      return { rows: [] };
    }});
  };
  const result = await runExecutionWorkerOnce({
    organisationId: "org-1", workerId: "worker-1", withTenantClient,
    execute: async task => {
      assert.equal(task.organisationId, "org-1");
      assert.equal(task.requesterId, "user-1");
      assert.equal(task.payload.risk, "read_only");
      return { summary: "Verified repository report" };
    }
  });
  assert.equal(result.status, "succeeded");
  assert.equal(result.jobId, "job-1");
  assert.equal(calls.filter(call => call[0] === "tenant").length, 2);
});

test("worker reports idle when no tenant-scoped job is available", async () => {
  const result = await runExecutionWorkerOnce({
    organisationId: "org-1", workerId: "worker-1",
    withTenantClient: async (_org, fn) => fn({ query: async () => ({ rows: [] }) }),
    execute: async () => { throw new Error("must not run"); }
  });
  assert.deepEqual(result, { status: "idle" });
});

test("worker records bounded failure without exposing raw exception details", async () => {
  const updates = [];
  const result = await runExecutionWorkerOnce({
    organisationId: "org-1", workerId: "worker-1",
    withTenantClient: async (org, fn) => fn({ query: async sql => {
      if (sql.includes("WITH candidate")) return { rows: [{
        id: "job-2", organisation_id: org, requester_user_id: "user-1",
        payload: { objective: "Read repo", capabilities: [], risk: "read_only" }, attempts: 1
      }] };
      updates.push(sql);
      return { rows: [{ id: "job-2", status: "queued" }] };
    }}),
    execute: async () => { throw new Error("secret token must never be persisted"); }
  });
  assert.equal(result.status, "queued");
  assert.equal(result.jobId, "job-2");
  assert.equal(updates.length, 1);
});

test("background worker supervisor stops gracefully while idle", async () => {
  const controller = new AbortController();
  const worker = startExecutionWorker({
    organisationId: "org-1", workerId: "worker-1",
    withTenantClient: async (_org, fn) => fn({ query: async () => ({ rows: [] }) }),
    execute: async () => ({ summary: "unused" }),
    pollIntervalMs: 250,
    signal: controller.signal
  });
  controller.abort();
  const result = await worker.done;
  assert.deepEqual(result, { status: "stopped" });
});
