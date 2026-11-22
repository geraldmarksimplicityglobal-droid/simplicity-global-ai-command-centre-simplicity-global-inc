const MUTATING_OPERATIONS = new Set([
  "domain.register", "domain.renew", "domain.transfer",
  "dns.create", "dns.update", "dns.delete",
  "nameserver.update", "ssl.issue", "hosting.deploy",
  "bing.verify", "production.publish"
]);

export function isMutatingOperation(operation) {
  return MUTATING_OPERATIONS.has(operation);
}

export function assertOperationAllowed({ operation, mode = "mock", approval, now = Date.now() }) {
  if (!operation || typeof operation !== "string") throw new TypeError("operation is required");
  if (mode === "mock" && isMutatingOperation(operation)) {
    throw new Error("Mutation blocked: mock mode does not permit external changes");
  }
  if (!isMutatingOperation(operation)) return true;
  if (!approval || approval.operation !== operation || approval.status !== "approved") {
    throw new Error("Mutation blocked: matching explicit approval is required");
  }
  if (!approval.target || !approval.approver || !approval.expiresAt || Date.parse(approval.expiresAt) <= now) {
    throw new Error("Mutation blocked: approval is incomplete or expired");
  }
  return true;
}
