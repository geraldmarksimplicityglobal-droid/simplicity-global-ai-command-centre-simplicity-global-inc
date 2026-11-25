const ALLOWED_TYPES = new Set([
  "invoice", "credit_note", "payment", "bank_transaction", "earning", "payout",
  "crypto_transfer", "crypto_fee", "exchange_trade", "valuation", "tax_adjustment"
]);

export function normaliseSourceEvent(input) {
  if (!input || typeof input !== "object") throw new TypeError("source event required");
  for (const key of ["sourceSystem", "sourceId", "eventType", "currency", "occurredAt"]) {
    if (typeof input[key] !== "string" || !input[key].trim()) throw new TypeError(key + " is required");
  }
  if (!ALLOWED_TYPES.has(input.eventType)) throw new TypeError("unsupported financial event type");
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new TypeError("currency must be an ISO code");
  const occurredAt = new Date(input.occurredAt);
  if (!Number.isFinite(occurredAt.getTime())) throw new TypeError("occurredAt must be a valid date");
  if (typeof input.amount !== "string" && typeof input.amount !== "number") throw new TypeError("amount must be supplied as a decimal");
  if (typeof input.amount === "number" && !Number.isFinite(input.amount)) throw new TypeError("amount must be finite");
  return Object.freeze({
    sourceSystem: input.sourceSystem.trim(), sourceId: input.sourceId.trim(),
    eventType: input.eventType, currency: input.currency, amount: String(input.amount),
    occurredAt: occurredAt.toISOString(),
    externalReference: typeof input.externalReference === "string" ? input.externalReference.trim() : null,
    evidenceRef: typeof input.evidenceRef === "string" ? input.evidenceRef.trim() : null,
    status: "observed"
  });
}

export function sourceEventKey(event) {
  if (!event?.sourceSystem || !event?.sourceId) throw new TypeError("normalised source event required");
  return event.sourceSystem + ":" + event.sourceId;
}

export function findDuplicateSourceEvents(events) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const seen = new Set();
  const duplicates = [];
  for (const event of events) {
    const key = sourceEventKey(event);
    if (seen.has(key)) duplicates.push(key);
    else seen.add(key);
  }
  return duplicates;
}
