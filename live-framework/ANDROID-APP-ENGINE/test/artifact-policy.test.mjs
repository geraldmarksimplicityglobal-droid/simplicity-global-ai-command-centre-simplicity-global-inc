import test from "node:test";
import assert from "node:assert/strict";
import { classifyArtifact, validateArtifactRequest } from "../src/artifact-policy.mjs";
test("classifies APK and AAB paths case-insensitively", () => {
  assert.equal(classifyArtifact("/workspace/app.apk"), "apk");
  assert.equal(classifyArtifact("/workspace/release.AAB"), "aab");
});
test("rejects unsupported or extensionless artifacts", () => {
  assert.throws(() => classifyArtifact("/workspace/app.zip"), /unsupported artifact/);
  assert.throws(() => classifyArtifact("/workspace/app"), /unsupported artifact/);
});
test("accepts only authorised, distinct paths inside approved workspace", () => {
  assert.equal(validateArtifactRequest({ inputPath: "/workspace/source.apk", outputPath: "/workspace/out/release.apk", workspaceRoot: "/workspace", authorised: true }).type, "apk");
  assert.throws(() => validateArtifactRequest({ inputPath: "/workspace/../secret.apk", outputPath: "/workspace/out.apk", workspaceRoot: "/workspace", authorised: true }), /outside approved workspace/);
  assert.throws(() => validateArtifactRequest({ inputPath: "/workspace/source.apk", outputPath: "/workspace/source.apk", workspaceRoot: "/workspace", authorised: true }), /must differ/);
  assert.throws(() => validateArtifactRequest({ inputPath: "/workspace/source.apk", outputPath: "/workspace/out.apk", workspaceRoot: "/workspace", authorised: false }), /authorisation/);
});
