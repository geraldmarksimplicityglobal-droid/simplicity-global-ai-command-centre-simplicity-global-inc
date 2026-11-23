import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => readFile(path.join(root, "..", name), "utf8");
test("skill has discoverable Android triggers and operational guardrails", async () => {
  const skill = await read("SKILL.md");
  for (const term of ["name: sg-android-app-engineering", "Use when", "MT Manager", "APK", "AAB", "apksigner", "zipalign", "jarsigner", "not execute", "explicit approval", "DRM"]) {
    assert.ok(skill.toLowerCase().includes(term.toLowerCase()), "missing skill contract: " + term);
  }
});
test("manifest remains source-only and denies direct write capabilities", async () => {
  const manifest = JSON.parse(await read("manifest.json"));
  assert.equal(manifest.id, "SG-SKILL-BUILD-001");
  assert.equal(manifest.defaultMode, "read-only-mock");
  assert.equal(manifest.liveEnabled, false);
  assert.deepEqual(manifest.writeCapabilities, []);
  assert.equal(manifest.evidenceRequired, true);
});
test("toolchain policy denies execution and stores only secret references", async () => {
  const policy = JSON.parse(await read("config/toolchain-policy.json"));
  assert.equal(policy.default, "deny");
  assert.equal(policy.executionEnabled, false);
  assert.equal(policy.shell, false);
  assert.equal(policy.secretValuesInArgumentsOrLogs, false);
  assert.ok(policy.protectedOperations.includes("publish"));
});
test("Android job schema is strict and scopes approvals to one operation", async () => {
  const schema = JSON.parse(await read("schemas/android-job.schema.json"));
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.required.includes("authorised"));
  assert.equal(schema.properties.approval.properties.operations.maxItems, 1);
});
