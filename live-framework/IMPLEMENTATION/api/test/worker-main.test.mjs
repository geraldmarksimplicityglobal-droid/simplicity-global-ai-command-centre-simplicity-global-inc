import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkerEnvironment, startWorkerHost } from "../src/worker-main.mjs";

const validEnv = {
  SG_WORKER_ADAPTER_MODULE: "/opt/sg-worker/host-adapter.mjs",
  SG_WORKER_ORGANISATION_ID: "11111111-1111-4111-8111-111111111111",
  SG_WORKER_ID: "worker-east-1",
  SG_WORKER_POLL_INTERVAL_MS: "1500",
  SG_WORKER_LEASE_SECONDS: "60",
  SG_WORKER_MAX_ATTEMPTS: "5"
};

test("parses a bounded worker deployment configuration", () => {
  const config = parseWorkerEnvironment(validEnv);
  assert.equal(config.organisationId, validEnv.SG_WORKER_ORGANISATION_ID);
  assert.equal(config.workerId, "worker-east-1");
  assert.equal(config.pollIntervalMs, 1500);
  assert.equal(config.leaseSeconds, 60);
  assert.equal(config.maxAttempts, 5);
});

test("rejects missing adapter path and invalid tenant or worker identity", () => {
  for (const env of [
    { ...validEnv, SG_WORKER_ADAPTER_MODULE: "" },
    { ...validEnv, SG_WORKER_ADAPTER_MODULE: "relative/adapter.mjs" },
    { ...validEnv, SG_WORKER_ORGANISATION_ID: "not-a-uuid" },
    { ...validEnv, SG_WORKER_ID: "../bad" },
    { ...validEnv, SG_WORKER_POLL_INTERVAL_MS: "10" },
    { ...validEnv, SG_WORKER_LEASE_SECONDS: "2" },
    { ...validEnv, SG_WORKER_MAX_ATTEMPTS: "99" }
  ]) assert.throws(() => parseWorkerEnvironment(env));
});

test("refuses to start unless the trusted adapter verifies the exact worker identity", async () => {
  await assert.rejects(() => startWorkerHost({
    env: validEnv,
    loadAdapter: async () => ({
      verifyWorkerIdentity: async () => ({
        verified: true,
        organisationId: "22222222-2222-4222-8222-222222222222",
        workerId: "worker-east-1"
      }),
      withTenantClient: async (_org, fn) => fn({ query: async () => ({ rows: [] }) }),
      execute: async () => ({ summary: "not reached" })
    }),
    installSignalHandlers: false,
    signal: AbortSignal.abort()
  }), /did not verify the exact worker identity/);
});

test("requires an explicit host workload identity verifier before starting", async () => {
  await assert.rejects(() => startWorkerHost({
    env: validEnv,
    loadAdapter: async () => ({
      withTenantClient: async (_org, fn) => fn({ query: async () => ({ rows: [] }) }),
      execute: async () => ({ summary: "not reached" })
    }),
    installSignalHandlers: false,
    signal: AbortSignal.abort()
  }), /verifyWorkerIdentity/);
});

test("starts only with a matching verified workload adapter and supports graceful stop", async () => {
  let verified = false;
  const result = await startWorkerHost({
    env: validEnv,
    loadAdapter: async () => ({
      verifyWorkerIdentity: async request => {
        verified = true;
        return { verified: true, organisationId: request.organisationId, workerId: request.workerId };
      },
      withTenantClient: async (_org, fn) => fn({ query: async () => ({ rows: [] }) }),
      execute: async () => ({ summary: "not reached" })
    }),
    installSignalHandlers: false,
    signal: AbortSignal.abort()
  });
  assert.equal(verified, true);
  assert.equal(result.status, "stopped");
});
