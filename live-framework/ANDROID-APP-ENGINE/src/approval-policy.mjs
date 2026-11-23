const READ_ONLY_OPERATIONS = new Set(["inspect", "hash", "list-contents", "verify-signature", "verify-alignment"]);
export function validateApproval(request, policy = {}) {
  if (!request || typeof request !== "object") throw new TypeError("operation request is required");
  const operation = request.operation;
  if (typeof operation !== "string" || operation.trim() === "") throw new TypeError("operation is required");
  if (READ_ONLY_OPERATIONS.has(operation)) return true;
  const protectedOperations = Array.isArray(policy.protectedOperations) ? policy.protectedOperations : [];
  if (!protectedOperations.includes(operation)) throw new Error("operation is not allowlisted: " + operation);
  const approval = request.approval;
  const valid = approval && approval.status === "approved" &&
    typeof request.taskId === "string" && request.taskId.trim() !== "" && approval.taskId === request.taskId &&
    typeof request.target === "string" && request.target.trim() !== "" && approval.target === request.target &&
    Array.isArray(approval.operations) && approval.operations.length === 1 && approval.operations[0] === operation &&
    Number.isFinite(approval.expiresAt) && approval.expiresAt > Date.now();
  if (!valid) throw new Error("current task-, target- and operation-scoped approval is required");
  return true;
}
