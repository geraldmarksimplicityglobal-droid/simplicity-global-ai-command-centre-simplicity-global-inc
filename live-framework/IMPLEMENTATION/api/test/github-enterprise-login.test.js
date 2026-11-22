import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const webRoot = new URL("../../web/", import.meta.url);

test("GitHub Enterprise login uses brokered OIDC authorization code with PKCE", async () => {
  const source = await readFile(new URL("github-enterprise-login.js", webRoot), "utf8");
  for (const expected of [
    'response_type: "code"',
    'code_challenge_method: "S256"',
    "kc_idp_hint: SG_AUTH_CONFIG.providerHint",
    "transaction.state !== returnedState",
    "idClaims.nonce !== transaction.nonce",
    'credentials: "omit"',
    'cache: "no-store"'
  ]) assert.ok(source.includes(expected), "missing security contract: " + expected);
});

test("GitHub access tokens are not persisted in browser storage", async () => {
  const source = await readFile(new URL("github-enterprise-login.js", webRoot), "utf8");
  assert.match(source, /let accessToken = null/);
  assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem\([^,]*accessToken/i);
  assert.match(source, /sessionStorage\.removeItem\(STORAGE_KEY\)/);
});

test("sign-in configuration stub fails closed and contains no client secret", async () => {
  const source = await readFile(new URL("auth-config.js", webRoot), "utf8");
  assert.match(source, /issuer: ""/);
  assert.match(source, /clientId: ""/);
  assert.match(source, /providerHint: "github-enterprise"/);
  assert.doesNotMatch(source, /clientSecret|client_secret|access_token|refresh_token/i);
});

test("existing API continues to verify broker-issued OIDC access tokens", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  assert.match(source, /jwtVerify\(auth\.slice\(7\), jwks/);
  assert.match(source, /issuer, audience, algorithms/);
  assert.match(source, /user_not_provisioned/);
});
