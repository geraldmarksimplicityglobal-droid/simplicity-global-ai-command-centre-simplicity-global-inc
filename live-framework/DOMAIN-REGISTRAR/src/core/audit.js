export function createAuditEvent({ action, actor = "system", target, outcome, details = {}, timestamp = new Date().toISOString() }) {
  if (!action || !target || !outcome) throw new TypeError("action, target and outcome are required");
  return Object.freeze({
    eventId: crypto.randomUUID(),
    timestamp,
    actor,
    action,
    target,
    outcome,
    details
  });
}
