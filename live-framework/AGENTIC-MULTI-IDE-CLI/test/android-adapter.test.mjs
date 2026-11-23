import test from "node:test";
import assert from "node:assert/strict";
import { ANDROID_TERMUX_ADAPTER, createAgenticAndroidAdapter, buildAgenticAndroidInvocation } from "../src/android-adapter.mjs";

test("Android Termux adapter advertises bounded capabilities only", () => {
  assert.equal(ANDROID_TERMUX_ADAPTER.id, "android-termux");
  assert.equal(ANDROID_TERMUX_ADAPTER.permissionTier, "read-only-by-default");
  assert.equal(ANDROID_TERMUX_ADAPTER.supportsShell, false);
  assert.ok(ANDROID_TERMUX_ADAPTER.operations.includes("verify-signature"));
  assert.ok(!ANDROID_TERMUX_ADAPTER.operations.includes("raw-shell"));
});

test("agentic registry rejects duplicate adapter identifiers", () => {
  assert.throws(() => createAgenticAndroidAdapter([ANDROID_TERMUX_ADAPTER, ANDROID_TERMUX_ADAPTER]), /duplicate adapter/);
});

test("agentic registry returns detached capability data", () => {
  const registry = createAgenticAndroidAdapter();
  const item = registry.get("android-termux");
  assert.equal(item.platform, "android");
  assert.equal(Object.isFrozen(item.operations), true);
});

test("Android invocations pass through shared GEN SYSTEM bounds", () => {
  const root = "/data/data/com.termux/files/home/sg-work";
  const result = buildAgenticAndroidInvocation(
    { operation: "inspect-apk", inputPath: root + "/app.apk" },
    { workspaceRoots: [root], tools: { apkanalyzer: "/data/data/com.termux/files/usr/bin/apkanalyzer" } },
    { maxTimeoutMs: 60000, maxOutputBytes: 500000 }
  );
  assert.equal(result.shell, false);
  assert.equal(result.workingDirectory, root);
  assert.equal(result.timeoutMs, 30000);
  assert.equal(result.maxOutputBytes, 262144);
});