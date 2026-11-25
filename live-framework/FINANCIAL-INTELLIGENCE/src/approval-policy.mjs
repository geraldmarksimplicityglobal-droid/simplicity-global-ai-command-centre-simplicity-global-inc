const PROTECTED_OPERATIONS = new Set([
  "financial.journal.post", "financial.reconciliation.accept",
  "financial.invoice.issue", "financial.invoice.send",
  "financial.payment.execute", "financial.bank_transfer.execute",
  "financial.crypto_transfer.sign", "financial.crypto_transfer.broadcast",
  "financial.exchange_order.execute", "financial.tax.submit",
  "financial.credential.rotate", "production.database.migrate", "production.deploy"
]);

export function isProtectedFinancialOperation(operation) {
  return PROTECTED_OPERATIONS.has(operation);
}

export function assertFinancialActionAllowed({
  operation, resourceId, requesterId, risk = "high",
  approval, executionAuthorisation, now = Date.now()
}) {
  if (!isProtectedFinancialOperation(operation)) throw new Error("operation is not in the protected financial operation catalogue");
  if (!resourceId || !requesterId) throw new TypeError("resource and requester are required");
  const approvalExpiry = Date.parse(approval?.expiresAt);
  if (!approval || approval.status !== "approved" || approval.operation !== operation ||
      approval.resourceId !== resourceId || approval.requesterId !== requesterId ||
      !approval.reviewerId || !Number.isFinite(approvalExpiry) || approvalExpiry <= now) {
    throw new Error("current operation- and resource-scoped approval is required");
  }
  if ((risk === "high" || risk === "critical") && approval.reviewerId === requesterId) {
    throw new Error("high-risk financial actions require reviewer/requester separation");
  }
  const executionExpiry = Date.parse(executionAuthorisation?.expiresAt);
  if (!executionAuthorisation || executionAuthorisation.status !== "authorised" ||
      executionAuthorisation.operation !== operation || executionAuthorisation.resourceId !== resourceId ||
      !executionAuthorisation.authoriserId || executionAuthorisation.authoriserId === approval.reviewerId ||
      !Number.isFinite(executionExpiry) || executionExpiry <= now) {
    throw new Error("separate, current execution authorisation is required");
  }
  return true;
}
