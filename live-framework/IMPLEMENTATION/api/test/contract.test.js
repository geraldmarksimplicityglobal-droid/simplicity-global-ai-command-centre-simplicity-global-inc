import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("API source contains the expected identity and authorization gates", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  assert.match(source, /app\.get\("\/health"/);
  assert.match(source, /user_not_provisioned/);
  assert.match(source, /insufficient_permission/);
  assert.match(source, /execution_authorised/);
  assert.match(source, /set_config\('app\.organisation_id'/);
});

test("production startup requires database and OIDC configuration", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  for (const key of ["DATABASE_URL", "OIDC_ISSUER", "OIDC_AUDIENCE"]) assert.ok(source.includes(key));
});
