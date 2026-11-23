import test from "node:test";
import assert from "node:assert/strict";
import { validateApproval } from "../src/approval-policy.mjs";
const request = { taskId: "task-7", target: "/workspace/out.apk", operation: "sign" };
const policy = { protectedOperations: ["sign", "install", "publish"] };
function approval(overrides = {}) {
  return { status: "approved", taskId: "task-7", target: "/workspace/out.apk", operations: ["sign"], expiresAt: Date.now() + 60000, ...overrides };
}
test("accepts a current approval scoped to task, target and operation", () => {
  assert.equal(validateApproval({ ...request, approval: approval() }, policy), true);
});
test("fails closed for missing, expired, mismatched or overbroad approval", () => {
  assert.throws(() => validateApproval(request, policy), /approval is required/);
  assert.throws(() => validateApproval({ ...request, approval: approval({ expiresAt: 1 }) }, policy), /approval is required/);
  assert.throws(() => validateApproval({ ...request, approval: approval({ target: "/workspace/other.apk" }) }, policy), /approval is required/);
  assert.throws(() => validateApproval({ ...request, approval: approval({ operations: ["sign", "publish"] }) }, policy), /approval is required/);
});
test("does not require approval for read-only inspection", () => {
  assert.equal(validateApproval({ ...request, operation: "inspect" }, policy), true);
});
