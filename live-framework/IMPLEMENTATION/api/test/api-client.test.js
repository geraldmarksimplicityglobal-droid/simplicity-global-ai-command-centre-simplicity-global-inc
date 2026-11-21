import test from "node:test";
import assert from "node:assert/strict";
import { createFrameworkApi, FrameworkApiError } from "../../web/api-client.js";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("API client requires an access-token and organisation-context provider", () => {
  assert.throws(() => createFrameworkApi({ baseUrl: "https://api.example.test/" }), TypeError);
});

test("API client rejects insecure non-local API origins", () => {
  assert.throws(() => createFrameworkApi({
    baseUrl: "http://api.example.test/",
    getAccessToken: () => "x".repeat(32),
    getOrganisationId: () => "org"
  }), TypeError);
});

test("identity endpoint does not require an organisation selection", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({ userId: "user-1" }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
  const api = createFrameworkApi({
    baseUrl: "https://api.example.test/",
    getAccessToken: () => "test-access-token-value-123456",
    getOrganisationId: () => { throw new Error("must not be called for /api/me"); }
  });
  const result = await api.me();
  assert.equal(result.userId, "user-1");
  assert.equal(captured.url, "https://api.example.test/api/me");
  assert.equal(captured.options.headers.Authorization, "Bearer test-access-token-value-123456");
  assert.equal(captured.options.headers["x-organisation-id"], undefined);
  assert.equal(captured.options.credentials, "omit");
  assert.equal(captured.options.cache, "no-store");
});

test("asset calls carry organisation and optional legal-entity scope", async () => {
  let captured;
  globalThis.fetch = async (_url, options) => {
    captured = options;
    return new Response(JSON.stringify({ data: [] }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
  const api = createFrameworkApi({
    baseUrl: "https://api.example.test/",
    getAccessToken: () => "test-access-token-value-123456",
    getOrganisationId: () => "org-123",
    getLegalEntityId: () => "entity-456"
  });
  await api.listAssets();
  assert.equal(captured.headers["x-organisation-id"], "org-123");
  assert.equal(captured.headers["x-legal-entity-id"], "entity-456");
  assert.equal(captured.credentials, "omit");
});

test("API failures expose a safe code without response payloads", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: "insufficient_permission_or_scope",
    sensitive: "must-not-be-included"
  }), { status: 403, headers: { "content-type": "application/json" } });
  const api = createFrameworkApi({
    baseUrl: "https://api.example.test/",
    getAccessToken: () => "test-access-token-value-123456",
    getOrganisationId: () => "org-123"
  });
  await assert.rejects(api.listAssets(), error => {
    assert.ok(error instanceof FrameworkApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, "insufficient_permission_or_scope");
    assert.equal(error.message.includes("sensitive"), false);
    return true;
  });
});
