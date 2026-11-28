import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerHostAdapter } from "../src/worker-host-adapter.mjs";

const env = {
  DATABASE_URL: "postgres://runtime:runtime@localhost:5432/sg_test",
  NODE_ENV: "test",
  SG_WORKER_ORGANISATION_ID: "11111111-1111-4111-8111-111111111111",
  SG_WORKER_ID: "worker-east-1",
  SG_WORKER_OIDC_ISSUER: "https://identity.example.test/",
  SG_WORKER_OIDC_JWKS_URL: "https://identity.example.test/.well-known/jwks.json",
  SG_WORKER_OIDC_AUDIENCE: "sg-aif-worker",
  SG_WORKER_IDENTITY_TOKEN_FILE: "/run/secrets/worker-token",
  SG_WORKER_EXECUTOR_MODULE: "/opt/sg-worker/executor.mjs"
};

function makeDependencies({ claims, role = { rolsuper: false, rolbypassrls: false, owns_jobs: false }, member = true, executorResult = { status: "completed", summary: "done" } } = {}) {
  const statements = [];
  const client = {
    async query(sql, params = []) {
      statements.push({ sql, params });
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
      if (sql.includes("FROM pg_roles")) return { rows: [role] };
      if (sql.includes("FROM app_users u JOIN user_memberships")) {
        return { rows: member ? [{ id: "service-user-1" }] : [] };
      }
      if (sql.includes("set_config")) return { rows: [] };
      return { rows: [] };
    },
    release() { statements.push({ sql: "RELEASE" }); }
  };
  class Pool {
    constructor(options) { this.options = options; }
    async connect() { return client; }
  }
  const payload = claims ?? {
    iss: env.SG_WORKER_OIDC_ISSUER,
    sub: "sg-worker-service-principal",
    aud: env.SG_WORKER_OIDC_AUDIENCE,
    sg_organisation_id: env.SG_WORKER_ORGANISATION_ID,
    sg_worker_id: env.SG_WORKER_ID
  };
  return {
    statements, client, PoolClass: Pool,
    verifyJwt: async (token, jwks, options) => {
      assert.equal(token, "signed-workload-token");
      assert.equal(options.issuer, env.SG_WORKER_OIDC_ISSUER);
      assert.equal(options.audience, env.SG_WORKER_OIDC_AUDIENCE);
      return { payload };
    },
    loadToken: async path => {
      assert.equal(path, env.SG_WORKER_IDENTITY_TOKEN_FILE);
      return "signed-workload-token";
    },
    loadExecutor: async path => {
      assert.equal(path, env.SG_WORKER_EXECUTOR_MODULE);
      return { execute: async () => executorResult };
    },
    createJwks: url => ({ url })
  };
}

test("verifies the exact organisation and worker identity from a signed workload token", async () => {
  const deps = makeDependencies();
  const adapter = createWorkerHostAdapter({ env, ...deps });
  assert.deepEqual(await adapter.verifyWorkerIdentity({
    organisationId: env.SG_WORKER_ORGANISATION_ID,
    workerId: env.SG_WORKER_ID
  }), {
    verified: true,
    organisationId: env.SG_WORKER_ORGANISATION_ID,
    workerId: env.SG_WORKER_ID
  });
});

test("rejects workload tokens with a different organisation or worker", async () => {
  const deps = makeDependencies({ claims: {
    iss: env.SG_WORKER_OIDC_ISSUER,
    sub: "sg-worker-service-principal",
    aud: env.SG_WORKER_OIDC_AUDIENCE,
    sg_organisation_id: "22222222-2222-4222-8222-222222222222",
    sg_worker_id: env.SG_WORKER_ID
  }});
  const adapter = createWorkerHostAdapter({ env, ...deps });
  await assert.rejects(() => adapter.verifyWorkerIdentity({
    organisationId: env.SG_WORKER_ORGANISATION_ID,
    workerId: env.SG_WORKER_ID
  }), /identity claims do not match/);
});

test("opens a tenant transaction only for an active workload principal with organisation membership and a non-owner NOBYPASSRLS role", async () => {
  const deps = makeDependencies();
  const adapter = createWorkerHostAdapter({ env, ...deps });
  const result = await adapter.withTenantClient(env.SG_WORKER_ORGANISATION_ID, async client => {
    assert.equal(client, deps.client);
    return "tenant-scoped-result";
  });
  assert.equal(result, "tenant-scoped-result");
  assert.ok(deps.statements.some(x => x.sql.includes("BEGIN")));
  assert.ok(deps.statements.some(x => x.sql.includes("set_config") &&
    x.params.includes(env.SG_WORKER_OIDC_ISSUER) &&
    x.params.includes("sg-worker-service-principal")));
  assert.ok(deps.statements.some(x => x.sql.includes("COMMIT")));
  assert.ok(deps.statements.some(x => x.sql === "RELEASE"));
});

test("rejects database roles that can bypass row-level security or own the jobs table", async () => {
  for (const role of [
    { rolsuper: true, rolbypassrls: false, owns_jobs: false },
    { rolsuper: false, rolbypassrls: true, owns_jobs: false },
    { rolsuper: false, rolbypassrls: false, owns_jobs: true }
  ]) {
    const deps = makeDependencies({ role });
    const adapter = createWorkerHostAdapter({ env, ...deps });
    await assert.rejects(() => adapter.withTenantClient(
      env.SG_WORKER_ORGANISATION_ID, async () => "must-not-run"
    ), /database runtime role must be non-owner, non-superuser and NOBYPASSRLS/);
    assert.ok(deps.statements.some(x => x.sql === "ROLLBACK"));
  }
});

test("rejects workload principals without membership in the assigned organisation", async () => {
  const deps = makeDependencies({ member: false });
  const adapter = createWorkerHostAdapter({ env, ...deps });
  await assert.rejects(() => adapter.withTenantClient(
    env.SG_WORKER_ORGANISATION_ID, async () => "must-not-run"
  ), /active workload principal with organisation membership/);
  assert.ok(deps.statements.some(x => x.sql === "ROLLBACK"));
});

test("rejects an executor result that does not explicitly report a governed outcome", async () => {
  const deps = makeDependencies({ executorResult: { summary: "ambiguous" } });
  const adapter = createWorkerHostAdapter({ env, ...deps });
  const result = await adapter.execute({
    organisationId: env.SG_WORKER_ORGANISATION_ID,
    jobId: "job-1",
    requesterId: "requester-1",
    payload: { objective: "do work", capabilities: [], risk: "read_only" },
    attempt: 1,
    signal: new AbortController().signal
  });
  assert.equal(result.status, "policy_denied");
});

test("rejects malformed or high-impact queued payloads before calling the host executor", async () => {
  let called = false;
  const deps = makeDependencies();
  deps.loadExecutor = async () => ({ execute: async () => { called = true; return { status: "completed" }; } });
  const adapter = createWorkerHostAdapter({ env, ...deps });
  const result = await adapter.execute({
    organisationId: env.SG_WORKER_ORGANISATION_ID,
    jobId: "job-2",
    requesterId: "requester-1",
    payload: { objective: "send payment", capabilities: [], risk: "financial" },
    attempt: 1,
    signal: new AbortController().signal
  });
  assert.equal(result.status, "policy_denied");
  assert.equal(called, false);
});
