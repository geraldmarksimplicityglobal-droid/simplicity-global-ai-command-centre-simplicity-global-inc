import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import pg from "pg";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { isUuid, selectMembership, hasPermission } from "./scope.js";

const { Pool } = pg;
for (const key of ["DATABASE_URL", "OIDC_ISSUER", "OIDC_JWKS_URL", "OIDC_AUDIENCE"]) {
  if (!process.env[key]) throw new Error("Missing required environment variable: " + key);
}
const issuer = process.env.OIDC_ISSUER.replace(/\/$/, "");
const audience = process.env.OIDC_AUDIENCE;
new URL(issuer);
const jwks = createRemoteJWKSet(new URL(process.env.OIDC_JWKS_URL));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined
});
const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || "info", redact: ["req.headers.authorization", "*.email", "*.token"] },
  bodyLimit: 1024 * 1024,
  trustProxy: false
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: (process.env.CORS_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean),
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"]
});
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

app.decorateRequest("principal", null);
app.addHook("preHandler", async (request, reply) => {
  if (request.url === "/health" && request.method === "GET") return;
  const auth = request.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return reply.code(401).send({ error: "authentication_required" });
  try {
    const { payload } = await jwtVerify(auth.slice(7), jwks, {
      issuer, audience, algorithms: ["RS256", "ES256"]
    });
    if (typeof payload.sub !== "string" || payload.sub.length > 255) throw new Error("invalid_subject");
    request.principal = { issuer, subject: payload.sub };
  } catch {
    return reply.code(401).send({ error: "invalid_access_token" });
  }
});

async function withUserContext(principal, work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.user_issuer',$1,true), set_config('app.user_subject',$2,true)",
      [principal.issuer, principal.subject]
    );
    const identity = await client.query(
      "SELECT u.id FROM app_users u WHERE u.identity_issuer=$1 AND u.identity_subject=$2 AND u.status='active' LIMIT 1",
      [principal.issuer, principal.subject]
    );
    if (!identity.rowCount) {
      await client.query("ROLLBACK");
      return { unauthorized: true };
    }
    const memberships = await client.query(
      `SELECT m.organisation_id, m.legal_entity_id, r.role_key,
              COALESCE(array_agg(p.permission_key) FILTER (WHERE p.permission_key IS NOT NULL), ARRAY[]::text[]) AS permissions
       FROM user_memberships m
       JOIN roles r ON r.id=m.role_id
       LEFT JOIN role_permissions rp ON rp.role_id=r.id
       LEFT JOIN permissions p ON p.id=rp.permission_id
       WHERE m.user_id=$1
       GROUP BY m.organisation_id,m.legal_entity_id,r.role_key
       ORDER BY m.organisation_id`,
      [identity.rows[0].id]
    );
    const result = await work(client, { userId: identity.rows[0].id, memberships: memberships.rows });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function requireScope(request, reply, permission, handler, { allowEntityScope = false } = {}) {
  const requestedOrg = request.headers["x-organisation-id"];
  const requestedEntity = request.headers["x-legal-entity-id"] || null;
  if (!isUuid(requestedOrg)) return reply.code(400).send({ error: "valid_organisation_scope_required" });
  if (requestedEntity && !isUuid(requestedEntity)) return reply.code(400).send({ error: "invalid_legal_entity_scope" });
  if (requestedEntity && !allowEntityScope) {
    return reply.code(403).send({ error: "legal_entity_scope_not_supported_for_domain" });
  }
  const result = await withUserContext(request.principal, async (client, user) => {
    const membership = selectMembership(user.memberships, requestedOrg, requestedEntity, allowEntityScope);
    if (!hasPermission(membership, permission)) return { forbidden: true };
    await client.query("SELECT set_config('app.organisation_id',$1,true)", [requestedOrg]);
    if (allowEntityScope) {
      await client.query("SELECT set_config('app.legal_entity_id',$1,true)", [requestedEntity || "*"]);
    }
    return handler(client, user, membership, {
      organisationId: requestedOrg,
      legalEntityId: requestedEntity
    });
  });
  if (result?.unauthorized) return reply.code(403).send({ error: "user_not_provisioned" });
  if (result?.forbidden) return reply.code(403).send({ error: "insufficient_permission_or_scope" });
  return result;
}

app.get("/health", async () => ({ status: "ok", service: "sg-live-framework-api", mode: "health-only" }));
app.get("/api/me", async (request, reply) => {
  const result = await withUserContext(request.principal, async (_client, user) => ({
    userId: user.userId,
    memberships: user.memberships
  }));
  if (result?.unauthorized) return reply.code(403).send({ error: "user_not_provisioned" });
  return result;
});

app.get("/api/assets", async (request, reply) => requireScope(request, reply, "assets:read", async client => {
  const { rows } = await client.query(
    "SELECT id,name,category,environment,lifecycle_status,owner_user_id,evidence_ref,created_at,updated_at FROM assets ORDER BY created_at DESC LIMIT 500"
  );
  return { data: rows };
}, { allowEntityScope: true }));

app.post("/api/assets", async (request, reply) => requireScope(request, reply, "assets:write", async (client, user, _membership, scope) => {
  const body = request.body || {};
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 200 ||
      typeof body.category !== "string" || !body.category.trim() || body.category.length > 100) {
    return reply.code(400).send({ error: "invalid_asset_payload" });
  }
  const orgId = scope.organisationId;
  const { rows } = await client.query(
    "INSERT INTO assets (organisation_id,legal_entity_id,name,category,environment,lifecycle_status,owner_user_id) VALUES ($1,$2,$3,$4,$5,'unverified',$6) RETURNING id,name,category,environment,lifecycle_status,created_at",
    [orgId, scope.legalEntityId, body.name.trim(), body.category.trim(), typeof body.environment === "string" ? body.environment.slice(0,80) : "unknown", user.userId]
  );
  await client.query(
    "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'asset.created','asset',$3,'success')",
    [orgId, user.userId, rows[0].id]
  );
  reply.code(201);
  return { data: rows[0] };
}, { allowEntityScope: true }));

app.get("/api/compliance/documents", async (request, reply) => requireScope(request, reply, "compliance:read", async client => {
  const { rows } = await client.query(
    "SELECT id,document_code,title,jurisdiction,version,status,owner_user_id,effective_at,review_due_at FROM compliance_documents ORDER BY document_code LIMIT 500"
  );
  return { data: rows };
}));

app.get("/api/change-requests", async (request, reply) => requireScope(request, reply, "changes:read", async client => {
  const { rows } = await client.query(
    "SELECT id,title,description,target_system,risk_level,status,created_at,updated_at FROM change_requests ORDER BY created_at DESC LIMIT 500"
  );
  return { data: rows };
}));

app.post("/api/change-requests", async (request, reply) => requireScope(request, reply, "changes:request", async (client, user) => {
  const body = request.body || {};
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200 ||
      typeof body.description !== "string" || body.description.length > 5000 ||
      typeof body.targetSystem !== "string" || !["low","medium","high","critical"].includes(body.riskLevel)) {
    return reply.code(400).send({ error: "invalid_change_request" });
  }
  const orgId = request.headers["x-organisation-id"];
  const { rows } = await client.query(
    "INSERT INTO change_requests (organisation_id,requested_by,title,description,target_system,risk_level,status,execution_authorised) VALUES ($1,$2,$3,$4,$5,$6,'proposed',false) RETURNING id,title,target_system,risk_level,status,execution_authorised,created_at",
    [orgId,user.userId,body.title.trim(),body.description,body.targetSystem.slice(0,200),body.riskLevel]
  );
  await client.query(
    "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'change_request.created','change_request',$3,'success')",
    [orgId,user.userId,rows[0].id]
  );
  reply.code(201);
  return { data: rows[0] };
}));

app.get("/api/incidents", async (request, reply) => requireScope(request, reply, "incidents:read", async client => {
  const { rows } = await client.query(
    "SELECT id,reference_code,title,severity,status,owner_user_id,detected_at,resolved_at,created_at FROM incidents ORDER BY created_at DESC LIMIT 500"
  );
  return { data: rows };
}));

app.get("/api/audit-events", async (request, reply) => requireScope(request, reply, "audit:read", async client => {
  const { rows } = await client.query(
    "SELECT id,actor_user_id,action,target_type,target_id,outcome,correlation_id,occurred_at,evidence_ref FROM audit_events ORDER BY occurred_at DESC LIMIT 500"
  );
  return { data: rows };
}));

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, "request_failed");
  reply.code(500).send({ error: "internal_server_error" });
});
const close = async () => { await app.close(); await pool.end(); };
process.on("SIGTERM", close);
process.on("SIGINT", close);
await app.listen({ host: process.env.HOST || "127.0.0.1", port: Number(process.env.PORT || 8080) });
