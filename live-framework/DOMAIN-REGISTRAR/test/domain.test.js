import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDomain, domainRecord } from "../src/domain/domain.js";
import { assertOperationAllowed } from "../src/core/approval-gate.js";
import { createDomainSystem } from "../src/index.js";
import { bingProperty } from "../src/modules/bing-webmaster.js";
import { validateSitemapUrls } from "../src/modules/sitemap.js";

test("normalizes valid domains", () => assert.equal(normalizeDomain("  SimplicityGlobal.com. "), "simplicityglobal.com"));
test("rejects malformed domains", () => assert.throws(() => normalizeDomain("https://example.com")));
test("domain record remains unverified", () => assert.equal(domainRecord("simplicityglobal.com").ownershipVerified, false));
test("mock mode blocks domain purchases", () => assert.throws(() => assertOperationAllowed({ operation: "domain.register", mode: "mock" })));
test("mock system can inspect without external access", async () => {
  const system = createDomainSystem();
  const result = await system.registrar.inspect("simplicityglobal.com");
  assert.equal(result.providerResult.source, "mock");
});
test("Bing property is scoped to the canonical domain", () => {
  assert.equal(bingProperty("simplicityglobal.com").property, "https://simplicityglobal.com/");
});
test("sitemap validator rejects a foreign host", () => {
  assert.throws(() => validateSitemapUrls(["https://example.net/page"], "simplicityglobal.com"));
});
