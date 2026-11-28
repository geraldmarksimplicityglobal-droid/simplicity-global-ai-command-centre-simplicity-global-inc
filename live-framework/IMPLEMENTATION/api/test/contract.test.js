import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isUuid, selectMembership, hasPermission } from "../src/scope.js";

const org = "8b42a4d2-7e11-4b4f-9e3a-7c0c4d8e1234";
const entityA = "8b42a4d2-7e11-4b4f-9e3a-7c0c4d8e1235";
const entityB = "8b42a4d2-7e11-4b4f-9e3a-7c0c4d8e1236";

test("API source contains identity and permission enforcement", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  assert.match(source, /app\.get\("\/health"/);
  assert.match(source, /user_not_provisioned/);
  assert.match(source, /insufficient_permission_or_scope/);
  assert.match(source, /set_config\('app\.organisation_id'/);
  assert.match(source, /set_config\('app\.legal_entity_id'/);
});

test("production startup requires database and OIDC configuration", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  for (const key of ["DATABASE_URL", "OIDC_ISSUER", "OIDC_JWKS_URL", "OIDC_AUDIENCE"]) {
    assert.ok(source.includes(key));
  }
});

test("scope identifiers must be valid UUIDs", () => {
  assert.equal(isUuid(org), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(undefined), false);
});

test("entity-only membership cannot silently widen to organisation scope", () => {
  const memberships = [{ organisation_id: org, legal_entity_id: entityA, permissions: ["assets:read"] }];
  assert.equal(selectMembership(memberships, org, null, true), null);
  assert.equal(selectMembership(memberships, org, entityA, true), memberships[0]);
  assert.equal(selectMembership(memberships, org, entityB, true), null);
  assert.equal(selectMembership(memberships, org, entityA, false), null);
});

test("organisation-wide membership may select an entity only on entity-aware routes", () => {
  const global = { organisation_id: org, legal_entity_id: null, permissions: ["assets:read"] };
  assert.equal(selectMembership([global], org, null, true), global);
  assert.equal(selectMembership([global], org, entityA, true), global);
  assert.equal(selectMembership([global], org, entityA, false), null);
});

test("permissions are required and wildcard permission is explicit", () => {
  assert.equal(hasPermission({ permissions: ["assets:read"] }, "assets:read"), true);
  assert.equal(hasPermission({ permissions: ["assets:read"] }, "assets:write"), false);
  assert.equal(hasPermission({ permissions: ["*"] }, "assets:write"), true);
  assert.equal(hasPermission(null, "assets:read"), false);
});

test("schema enforces organisation-consistent role, entity and document references", async () => {
  const schema = await readFile(new URL("../../schema.postgresql.sql", import.meta.url), "utf8");
  assert.ok(schema.includes("FOREIGN KEY (organisation_id, role_id)"));
  assert.ok(schema.includes("FOREIGN KEY (organisation_id, legal_entity_id)"));
  assert.ok(schema.includes("FOREIGN KEY (organisation_id, document_id)"));
});

test("organisation RLS binds row scope to the API transaction organisation context", async () => {
  const security = await readFile(new URL("../../security-and-rls.sql", import.meta.url), "utf8");
  assert.match(security, /target_org = NULLIF\(current_setting\('app\.organisation_id', true\), ''\)::uuid/);
});
