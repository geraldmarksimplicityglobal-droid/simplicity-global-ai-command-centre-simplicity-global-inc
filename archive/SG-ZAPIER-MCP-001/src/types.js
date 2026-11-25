export const ProposalState = Object.freeze({
  DISCOVERED: "DISCOVERED",
  INSPECTED: "INSPECTED",
  PROPOSED: "PROPOSED",
  REVIEW_APPROVED: "REVIEW_APPROVED",
  EXECUTION_AUTHORIZED: "EXECUTION_AUTHORIZED",
  COPY_CREATED: "COPY_CREATED",
  COPY_TESTED: "COPY_TESTED",
  BLOCKED: "BLOCKED"
});

export function auditEvent(type, actorId, details = {}) {
  return Object.freeze({ type, actorId, at: new Date().toISOString(), details: structuredClone(details) });
}
