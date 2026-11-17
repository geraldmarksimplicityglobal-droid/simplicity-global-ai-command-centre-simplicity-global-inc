export const DEFAULT_POLICY = Object.freeze({
  defaultMode: "READ_ONLY",
  maxLogicalWorkers: 1000,
  initialConcurrency: 10,
  allowWorkerLaunch: false,
  allowFilesystemWrites: false,
  allowShellExecution: false,
  allowNetworkAccess: false,
  requirePatchReview: true,
  requireExplicitApprovalForExecution: true,
  preserveExistingFiles: true
});

export function validatePolicy(policy = DEFAULT_POLICY) {
  if (policy.defaultMode !== "READ_ONLY") {
    throw new Error("Initial policy must remain READ_ONLY");
  }
  if (policy.allowWorkerLaunch || policy.allowFilesystemWrites ||
      policy.allowShellExecution || policy.allowNetworkAccess) {
    throw new Error("Worker launch, writes, shell and network must remain disabled");
  }
  if (!Number.isInteger(policy.initialConcurrency) ||
      policy.initialConcurrency < 1 ||
      policy.initialConcurrency > policy.maxLogicalWorkers) {
    throw new Error("Invalid concurrency configuration");
  }
  if (policy.maxLogicalWorkers > 1000 || policy.maxLogicalWorkers < 1) {
    throw new Error("Logical worker ceiling must be between 1 and 1000");
  }
  if (!policy.requirePatchReview || !policy.requireExplicitApprovalForExecution) {
    throw new Error("Review and execution approval gates are mandatory");
  }
  return true;
}

export function mayExecute(action, approval) {
  if (!action || action.mode !== "APPROVED_EXECUTION") return false;
  return Boolean(
    approval &&
    approval.approved === true &&
    approval.actionId === action.id &&
    approval.scope === action.scope
  );
}
