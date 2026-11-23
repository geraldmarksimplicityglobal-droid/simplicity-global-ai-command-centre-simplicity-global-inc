import test from "node:test";
import assert from "node:assert/strict";
import { buildAndroidInvocation, createAndroidAdapterRegistry } from "../src/android-policy.mjs";

const root = "/data/data/com.termux/files/home/sg-work";
const apk = root + "/app.apk";
const digest = "a".repeat(64);
const policy = {
  workspaceRoots: [root],
  tools: {
    apkanalyzer: "/data/data/com.termux/files/usr/bin/apkanalyzer",
    apksigner: "/data/data/com.termux/files/usr/bin/apksigner",
    apktool: "/data/data/com.termux/files/usr/bin/apktool",
    zipalign: "/data/data/com.termux/files/usr/bin/zipalign",
    aapt: "/data/data/com.termux/files/usr/bin/aapt",
    which: "/data/data/com.termux/files/usr/bin/which",
    pm: "/system/bin/pm",
    monkey: "/system/bin/monkey"
  }
};

function approval(operation, resource) {
  return { approved: true, approvalId: "APR-1", taskId: "TASK-1", operation, resource, reviewer: "reviewer", expiresAt: Date.now() + 60000 };
}
function execution(operation, resource) {
  return { allowed: true, authorizationId: "AUTH-1", taskId: "TASK-1", operation, resource, actor: "executor", expiresAt: Date.now() + 60000 };
}
function resource(inputPath, outputPath, extra = {}) {
  return JSON.stringify({ inputPath, sha256: digest, outputPath, ...extra });
}

test("registry exposes Android capabilities without raw shell", () => {
  const registry = createAndroidAdapterRegistry();
  assert.equal(registry.get("android-termux").platform, "android");
  assert.equal(registry.get("android-termux").supportsShell, false);
  assert.ok(!registry.get("android-termux").operations.includes("raw-shell"));
});

test("read-only APK summary uses a fixed argument array", () => {
  const result = buildAndroidInvocation({ operation: "inspect-apk", inputPath: apk }, policy);
  assert.deepEqual(result.args, ["apk", "summary", apk]);
  assert.equal(result.shell, false);
  assert.equal(result.requiresApproval, false);
});

test("manifest, DEX, badging, alignment and signature checks are read-only", () => {
  assert.deepEqual(buildAndroidInvocation({ operation: "inspect-manifest", inputPath: apk }, policy).args, ["manifest", "print", apk]);
  assert.deepEqual(buildAndroidInvocation({ operation: "inspect-dex", inputPath: apk }, policy).args, ["dex", "list", apk]);
  assert.deepEqual(buildAndroidInvocation({ operation: "dump-badging", inputPath: apk }, policy).args, ["dump", "badging", apk]);
  assert.deepEqual(buildAndroidInvocation({ operation: "verify-alignment", inputPath: apk }, policy).args, ["-c", "-v", "4", apk]);
  assert.deepEqual(buildAndroidInvocation({ operation: "verify-signature", inputPath: apk }, policy).args, ["verify", "--verbose", "--print-certs", apk]);
});

test("unknown operations and paths outside the workspace are denied", () => {
  assert.throws(() => buildAndroidInvocation({ operation: "raw-shell", command: "id" }, policy), /not allowlisted/);
  assert.throws(() => buildAndroidInvocation({ operation: "inspect-apk", inputPath: "/sdcard/app.apk" }, policy), /outside approved workspace/);
});

test("decompile requires approval and execution authorization bound to input and output", () => {
  const outputPath = root + "/decoded";
  const bound = resource(apk, outputPath);
  const request = {
    operation: "decompile-apk", inputPath: apk, outputPath, taskId: "TASK-1", artifactSha256: digest,
    approval: approval("decompile-apk", bound), executionAuthorization: execution("decompile-apk", bound)
  };
  const result = buildAndroidInvocation(request, policy);
  assert.deepEqual(result.args, ["d", "-f", "-o", outputPath, apk]);
  assert.equal(result.requiresApproval, true);
  assert.throws(() => buildAndroidInvocation({ ...request, outputPath: root + "/other" }, policy), /valid scoped approval/);
});

test("signing binds input hash, output, keystore and alias; passwords stay out of argv", () => {
  const outputPath = root + "/app-signed.apk";
  const keystorePath = root + "/release.jks";
  const bound = resource(apk, outputPath, { keystorePath, keyAlias: "sg-release" });
  const result = buildAndroidInvocation({
    operation: "sign-apk", inputPath: apk, outputPath, keystorePath, keyAlias: "sg-release",
    taskId: "TASK-1", artifactSha256: digest,
    approval: approval("sign-apk", bound), executionAuthorization: execution("sign-apk", bound)
  }, policy);
  assert.ok(result.args.includes("--out"));
  assert.ok(result.args.includes("env:SG_ANDROID_KEYSTORE_PASSWORD"));
  assert.ok(result.args.includes("env:SG_ANDROID_KEY_PASSWORD"));
  assert.equal(result.args.includes("password-value"), false);
  assert.deepEqual(result.requiredEnvironment, ["SG_ANDROID_KEYSTORE_PASSWORD", "SG_ANDROID_KEY_PASSWORD"]);
});

test("signing rejects expired, mismatched and self-reviewed authorization", () => {
  const outputPath = root + "/app-signed.apk";
  const keystorePath = root + "/release.jks";
  const bound = resource(apk, outputPath, { keystorePath, keyAlias: "sg-release" });
  const request = {
    operation: "sign-apk", inputPath: apk, outputPath, keystorePath, keyAlias: "sg-release",
    taskId: "TASK-1", artifactSha256: digest,
    approval: approval("sign-apk", bound), executionAuthorization: execution("sign-apk", bound)
  };
  assert.throws(() => buildAndroidInvocation({ ...request, approval: { ...request.approval, expiresAt: 1 } }, policy), /valid scoped approval/);
  assert.throws(() => buildAndroidInvocation({ ...request, executionAuthorization: { ...request.executionAuthorization, resource: "different" } }, policy), /valid scoped execution authorization/);
  assert.throws(() => buildAndroidInvocation({ ...request, executionAuthorization: { ...request.executionAuthorization, actor: "reviewer" } }, policy), /different from reviewer/);
});

test("keystore must be inside the approved workspace and paths must be distinct", () => {
  const outputPath = root + "/app-signed.apk";
  const bound = resource(apk, outputPath, { keystorePath: root + "/release.jks", keyAlias: "sg-release" });
  const request = {
    operation: "sign-apk", inputPath: apk, outputPath, keystorePath: "/sdcard/release.jks", keyAlias: "sg-release",
    taskId: "TASK-1", artifactSha256: digest,
    approval: approval("sign-apk", bound), executionAuthorization: execution("sign-apk", bound)
  };
  assert.throws(() => buildAndroidInvocation(request, policy), /keystorePath is outside approved workspace/);
});

test("MT Manager launch requires the discovered installed package ID", () => {
  const bound = "android:package:bin.mt.plus";
  const request = {
    operation: "launch-mt-manager", packageId: "bin.mt.plus", discoveredPackageId: "bin.mt.plus",
    taskId: "TASK-1", approval: approval("launch-mt-manager", bound),
    executionAuthorization: execution("launch-mt-manager", bound)
  };
  assert.deepEqual(buildAndroidInvocation(request, policy).args, ["-p", "bin.mt.plus", "-c", "android.intent.category.LAUNCHER", "1"]);
  assert.throws(() => buildAndroidInvocation({ ...request, discoveredPackageId: "other.package" }, policy), /package id/);
});
