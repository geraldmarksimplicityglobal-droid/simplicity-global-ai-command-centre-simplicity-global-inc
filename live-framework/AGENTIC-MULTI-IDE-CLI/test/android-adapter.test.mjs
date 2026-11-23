import test from "node:test";
import assert from "node:assert/strict";
import { ANDROID_TERMUX_ADAPTER, createAgenticAndroidAdapter } from "../src/android-adapter.mjs";

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