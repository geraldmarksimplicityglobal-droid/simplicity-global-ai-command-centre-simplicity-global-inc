import test from "node:test";
import assert from "node:assert/strict";
import { buildSigningPlan } from "../src/signing-plan.mjs";
function request(type = "apk") {
  const inputPath = "/workspace/source." + type;
  const outputPath = "/workspace/out/release." + type;
  return { inputPath, outputPath, workspaceRoot: "/workspace", authorised: true, taskId: "task-9",
    approval: { status: "approved", taskId: "task-9", target: outputPath, operations: ["sign"], expiresAt: Date.now() + 60000 } };
}
test("APK plan aligns before signing and verifies both signature and alignment", () => {
  const plan = buildSigningPlan(request("apk"));
  assert.equal(plan.artifactType, "apk");
  assert.equal(plan.execution, "not-executed");
  assert.deepEqual(plan.commands.map(item => item.tool), ["zipalign", "apksigner", "apksigner", "zipalign"]);
  assert.match(plan.commands[1].args.join(" "), /secret-store/);
  assert.doesNotMatch(JSON.stringify(plan), /password\s*[:=]\s*[^,}]+/i);
});
test("AAB plan uses jarsigner and no APK-only tools", () => {
  const plan = buildSigningPlan(request("aab"));
  assert.equal(plan.artifactType, "aab");
  assert.deepEqual(plan.commands.map(item => item.tool), ["jarsigner", "jarsigner"]);
});
test("signing requires exact, current approval for the output target", () => {
  const denied = request("apk"); denied.approval.expiresAt = 1;
  assert.throws(() => buildSigningPlan(denied), /approval is required/);
  const wrongTarget = request("apk"); wrongTarget.approval.target = "/workspace/out/other.apk";
  assert.throws(() => buildSigningPlan(wrongTarget), /approval is required/);
});
