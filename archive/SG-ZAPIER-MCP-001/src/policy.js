export const DEFAULT_POLICY = Object.freeze({
  allowLiveWrites: false,
  allowOverwrite: false,
  allowDelete: false,
  allowProductionActivation: false,
  requireDistinctReviewerAndExecutor: true,
  requireCopyOnly: true
});

export function assertNonEmpty(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(label + " must be a non-empty string");
}

export function assertDistinctActors(reviewerId, executorId, policy) {
  if (policy.requireDistinctReviewerAndExecutor && reviewerId === executorId) {
    throw new Error("Reviewer and execution authorizer must be different actors");
  }
}
