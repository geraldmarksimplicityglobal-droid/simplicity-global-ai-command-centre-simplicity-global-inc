import test from "node:test";
import assert from "node:assert/strict";
import {
  validateExecutionJob,
  enqueueExecutionJob,
  claimExecutionJob,
  completeExecutionJob,
  failExecutionJob,
  cancelExecutionJob
} from "../src/execution-jobs.mjs";

function fakeClient(responses = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next ?? { rows: [], rowCount: 0 };
    }
  };
}

test("execution job payload is allowlisted and excludes secrets", () => {
  const value = validateExecutionJob({
    objective: "Generate a repository report",
    capabilities: ["repository.read"],
    risk: "read_only",
    idempotencyKey: "report-1"
  });
  assert.equal(value.objective, "Generate a repository report");
  assert.equal(value.risk, "read_only");
  assert.throws(() => validateExecutionJob({
    objective: "x", capabilities: [], risk: "financial", apiKey: "secret"
  }), /unsupported field/);
});

test("background queue rejects high-impact operations even if caller supplies approval flags", () => {
  assert.throws(() => validateExecutionJob({
    objective: "Transfer funds", capabilities: ["payments.transfer"],
    risk: "financial", approved: true
  }), /background jobs currently allow only read_only or reversible/);
});

test("enqueue persists tenant-scoped job and returns only safe job metadata", async () => {
  const client = fakeClient([{ rows: [{ id: "job-1", status: "queued", created_at: "2026-11-28T00:00:00Z" }], rowCount: 1 }]);
  const result = await enqueueExecutionJob(client, {
    organisationId: "org-1", requesterId: "user-1",
    input: { objective: "Generate report", capabilities: ["repository.read"], risk: "read_only", idempotencyKey: "key-1" }
  });
  assert.equal(result.id, "job-1");
  assert.equal(result.status, "queued");
  assert.match(client.calls[0].sql, /INSERT INTO aif_execution_jobs/);
  assert.equal(client.calls[0].params[0], "org-1");
  assert.equal(client.calls[0].params[1], "user-1");
  assert.doesNotMatch(JSON.stringify(result), /token|secret|credential/i);
});

test("claim uses SKIP LOCKED and bounded leases", async () => {
  const client = fakeClient([{ rows: [{ id: "job-2", organisation_id: "org-1", payload: { objective: "x" }, attempts: 1 }], rowCount: 1 }]);
  const result = await claimExecutionJob(client, { workerId: "worker-1", leaseSeconds: 60 });
  assert.equal(result.id, "job-2");
  assert.match(client.calls[0].sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(client.calls[0].sql, /lease_until/);
  assert.equal(client.calls[0].params[0], "worker-1");
  assert.equal(client.calls[0].params[1], 60);
});

test("completion is fenced to the owning worker lease", async () => {
  const client = fakeClient([{ rows: [{ id: "job-2", status: "succeeded" }], rowCount: 1 }]);
  const result = await completeExecutionJob(client, { jobId: "job-2", workerId: "worker-1", result: { summary: "done" } });
  assert.equal(result.status, "succeeded");
  assert.match(client.calls[0].sql, /worker_id/);
  assert.match(client.calls[0].sql, /status='running'/);
});

test("failure stores a bounded safe error code rather than raw exception text", async () => {
  const client = fakeClient([{ rows: [{ id: "job-2", status: "queued" }], rowCount: 1 }]);
  const result = await failExecutionJob(client, { jobId: "job-2", workerId: "worker-1", errorCode: "provider_unavailable" });
  assert.equal(result.status, "queued");
  assert.doesNotMatch(client.calls[0].params.join(" "), /password|token|secret/i);
});

test("cancellation is tenant-scoped and only cancels queued jobs", async () => {
  const client = fakeClient([{ rows: [{ id: "job-3", status: "cancelled" }], rowCount: 1 }]);
  const result = await cancelExecutionJob(client, { organisationId: "org-1", jobId: "job-3", requesterId: "user-1" });
  assert.equal(result.status, "cancelled");
  assert.match(client.calls[0].sql, /organisation_id/);
  assert.match(client.calls[0].sql, /requester_user_id/);
  assert.match(client.calls[0].sql, /status='queued'/);
});

test("claim fails closed on invalid lease parameters", async () => {
  const client = fakeClient();
  await assert.rejects(() => claimExecutionJob(client, { workerId: "worker-1", leaseSeconds: 0 }), /leaseSeconds/);
  assert.equal(client.calls.length, 0);
});
