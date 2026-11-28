import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { createRemoteJWKSet, jwtVerify } from "jose";

const { Pool } = pg;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORKER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const RISKS = new Set(["read_only", "reversible"]);
const EXECUTOR_STATUSES = new Set([
  "completed", "approval_required", "authorization_required",
  "connector_required", "policy_denied"
]);

function required(env, key) {
  const value = typeof env[key] === "string" ? env[key].trim() : "";
  if (!value) throw new TypeError(key + " is required");
  return value;
}

function absolutePath(env, key) {
  const value = required(env, key);
  if (!isAbsolute(value)) throw new TypeError(key + " must be an absolute path");
  return value;
}

function parseConfig(env) {
  const databaseUrl = required(env, "DATABASE_URL");
  const database = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new TypeError("DATABASE_URL must use PostgreSQL");
  }
  const issuer = required(env, "SG_WORKER_OIDC_ISSUER");
  const issuerUrl = new URL(issuer);
  if (issuerUrl.protocol !== "https:") throw new TypeError("worker OIDC issuer must use HTTPS");
  const jwksUrl = required(env, "SG_WORKER_OIDC_JWKS_URL");
  const jwks = new URL(jwksUrl);
  if (jwks.protocol !== "https:") throw new TypeError("worker OIDC JWKS URL must use HTTPS");
  const organisationId = required(env, "SG_WORKER_ORGANISATION_ID");
  if (!UUID.test(organisationId)) throw new TypeError("SG_WORKER_ORGANISATION_ID must be a UUID");
  const workerId = required(env, "SG_WORKER_ID");
  if (!WORKER_ID.test(workerId)) throw new TypeError("SG_WORKER_ID has an invalid format");
  return Object.freeze({
    databaseUrl,
    issuer,
    jwksUrl,
    audience: required(env, "SG_WORKER_OIDC_AUDIENCE"),
    identityTokenFile: absolutePath(env, "SG_WORKER_IDENTITY_TOKEN_FILE"),
    executorModule: absolutePath(env, "SG_WORKER_EXECUTOR_MODULE"),
    organisationId,
    workerId,
    production: env.NODE_ENV === "production"
  });
}

/**
 * Create a deployment-managed worker adapter.
 *
 * The workload token must be issued by the configured OIDC provider and carry
 * exact sg_organisation_id and sg_worker_id claims. Its subject must be
 * provisioned as an active app_users identity and have membership in that
 * organisation. The database login must be non-owner, non-superuser and
 * NOBYPASSRLS. The executor is a separately reviewed host module.
 */
export function createWorkerHostAdapter({
  env = process.env,
  PoolClass = Pool,
  verifyJwt = jwtVerify,
  loadToken = path => readFile(path, "utf8"),
  loadExecutor = modulePath => import(pathToFileURL(modulePath).href),
  createJwks = url => createRemoteJWKSet(url)
} = {}) {
  const config = parseConfig(env);
  const pool = new PoolClass({
    connectionString: config.databaseUrl,
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    ...(config.production ? { ssl: { rejectUnauthorized: true } } : {})
  });
  const jwks = createJwks(new URL(config.jwksUrl));
  let executorPromise;

  async function verifiedClaims() {
    const token = String(await loadToken(config.identityTokenFile)).trim();
    if (!token || /\s/.test(token)) throw new Error("workload identity token is unavailable");
    const { payload } = await verifyJwt(token, jwks, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ["RS256", "ES256"]
    });
    if (!payload || typeof payload.sub !== "string" || !payload.sub.trim() ||
        payload.iss !== config.issuer ||
        payload.sg_organisation_id !== config.organisationId ||
        payload.sg_worker_id !== config.workerId) {
      throw new Error("workload identity claims do not match the configured worker");
    }
    return payload;
  }

  async function verifyWorkerIdentity({ organisationId, workerId } = {}) {
    const payload = await verifiedClaims();
    if (organisationId !== config.organisationId || workerId !== config.workerId ||
        payload.sg_organisation_id !== organisationId || payload.sg_worker_id !== workerId) {
      throw new Error("workload identity claims do not match the configured worker");
    }
    return Object.freeze({ verified: true, organisationId, workerId });
  }

  async function withTenantClient(organisationId, callback) {
    if (organisationId !== config.organisationId) {
      throw new Error("worker cannot access an unassigned organisation");
    }
    if (typeof callback !== "function") throw new TypeError("tenant callback is required");
    const payload = await verifiedClaims();
    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query("BEGIN");
      transactionOpen = true;
      const role = await client.query(
        `SELECT r.rolsuper, r.rolbypassrls, c.relowner = r.oid AS owns_jobs
         FROM pg_roles r
         JOIN pg_class c ON c.oid = 'public.aif_execution_jobs'::regclass
         WHERE r.rolname = current_user`
      );
      const attributes = role.rows[0];
      if (!attributes || attributes.rolsuper || attributes.rolbypassrls || attributes.owns_jobs) {
        throw new Error("database runtime role must be non-owner, non-superuser and NOBYPASSRLS");
      }
      await client.query(
        "SELECT set_config('app.user_issuer',$1,true), set_config('app.user_subject',$2,true), set_config('app.organisation_id',$3,true)",
        [config.issuer, payload.sub, organisationId]
      );
      const membership = await client.query(
        `SELECT u.id
         FROM public.app_users u
         JOIN public.user_memberships m ON m.user_id = u.id
         WHERE u.identity_issuer=$1 AND u.identity_subject=$2
           AND u.status='active' AND m.organisation_id=$3
         LIMIT 1`,
        [config.issuer, payload.sub, organisationId]
      );
      if (!membership.rows[0]) {
        throw new Error("worker requires an active workload principal with organisation membership");
      }
      const result = await callback(client);
      await client.query("COMMIT");
      transactionOpen = false;
      return result;
    } catch (error) {
      if (transactionOpen) {
        try { await client.query("ROLLBACK"); } catch { /* preserve the original failure */ }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function getExecutor() {
    if (!executorPromise) {
      executorPromise = Promise.resolve(loadExecutor(config.executorModule)).then(module => {
        if (!module || typeof module.execute !== "function") {
          throw new TypeError("trusted executor module must export execute");
        }
        return module.execute;
      }).catch(error => {
        executorPromise = null;
        throw error;
      });
    }
    return executorPromise;
  }

  async function execute(task) {
    const payload = task?.payload;
    if (!task || task.organisationId !== config.organisationId ||
        typeof task.jobId !== "string" || !task.jobId ||
        typeof task.requesterId !== "string" || !task.requesterId ||
        !payload || typeof payload !== "object" || Array.isArray(payload) ||
        typeof payload.objective !== "string" || !payload.objective.trim() ||
        payload.objective.length > 4000 ||
        !Array.isArray(payload.capabilities) || payload.capabilities.length > 100 ||
        payload.capabilities.some(value => typeof value !== "string" || !value.trim() || value.length > 200) ||
        !RISKS.has(payload.risk)) {
      return Object.freeze({ status: "policy_denied", summary: "Task payload failed worker-side validation" });
    }
    const identity = await verifyWorkerIdentity({
      organisationId: task.organisationId,
      workerId: config.workerId
    });
    const run = await getExecutor();
    const result = await run({ ...task, workerIdentity: identity });
    if (!result || typeof result !== "object" ||
        !EXECUTOR_STATUSES.has(result.status) ||
        (result.summary != null && (typeof result.summary !== "string" || result.summary.length > 1000)) ||
        (result.status === "completed" && (typeof result.summary !== "string" || !result.summary.trim()))) {
      return Object.freeze({ status: "policy_denied", summary: "Trusted executor returned an invalid outcome" });
    }
    return Object.freeze({
      status: result.status,
      summary: result.summary ?? "Task requires an authorization or policy decision"
    });
  }

  return Object.freeze({ verifyWorkerIdentity, withTenantClient, execute });
}

let defaultAdapter;
function getDefaultAdapter() {
  if (!defaultAdapter) defaultAdapter = createWorkerHostAdapter();
  return defaultAdapter;
}

export async function verifyWorkerIdentity(input) {
  return getDefaultAdapter().verifyWorkerIdentity(input);
}
export async function withTenantClient(organisationId, callback) {
  return getDefaultAdapter().withTenantClient(organisationId, callback);
}
export async function execute(task) {
  return getDefaultAdapter().execute(task);
}
