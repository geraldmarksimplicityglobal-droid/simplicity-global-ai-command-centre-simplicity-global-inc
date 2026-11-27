function toBaseUnits(amount, decimals) {
  if (typeof amount !== "string" || !/^(0|[1-9]\\d*)(\\.\\d+)?$/.test(amount)) {
    throw new TypeError("amount must be a positive plain decimal string");
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals && [...fraction.slice(decimals)].some(digit => digit !== "0")) {
    throw new RangeError("amount has more decimal places than token decimals");
  }
  const scale = 10n ** BigInt(decimals);
  const padded = (fraction.slice(0, decimals) + "0".repeat(decimals)).slice(0, decimals);
  const units = BigInt(whole) * scale + BigInt(padded || "0");
  if (units <= 0n) throw new RangeError("amount must be greater than zero");
  return units.toString();
}

export function createTreasuryInstruction(input) {
  if (!input || typeof input !== "object") throw new TypeError("instruction input required");
  if (input.mode !== "sandbox") throw new Error("live execution is disabled; only sandbox instructions are accepted");
  if (typeof input.id !== "string" || !input.id.trim()) throw new TypeError("instruction id required");
  if (typeof input.assetCode !== "string" || !/^[A-Z0-9]{2,12}$/.test(input.assetCode)) {
    throw new TypeError("assetCode must be a stable asset identifier");
  }
  if (typeof input.network !== "string" || !input.network.trim()) throw new TypeError("network required");
  if (!Number.isInteger(input.tokenDecimals) || input.tokenDecimals < 0 || input.tokenDecimals > 18) {
    throw new RangeError("tokenDecimals must be an integer from 0 to 18");
  }
  if (typeof input.destinationRef !== "string" || !input.destinationRef.trim()) {
    throw new TypeError("opaque destinationRef required");
  }
  // Validate the amount before retaining it; no wallet address or signing material is accepted here.
  toBaseUnits(input.amount, input.tokenDecimals);
  return Object.freeze({
    id: input.id.trim(), assetCode: input.assetCode, network: input.network.trim(),
    tokenDecimals: input.tokenDecimals, amount: input.amount,
    destinationRef: input.destinationRef.trim(), mode: "sandbox",
    status: "draft", liveExecutionAllowed: false, fundsMoved: false
  });
}

export function validateTreasuryInstruction(instruction) {
  if (!instruction || instruction.mode !== "sandbox" || instruction.status !== "draft") {
    throw new Error("only sandbox draft instructions can be validated");
  }
  const amountBaseUnits = toBaseUnits(instruction.amount, instruction.tokenDecimals);
  return Object.freeze({ ...instruction, amountBaseUnits, status: "validated" });
}

export function simulateTreasuryInstruction(instruction) {
  if (!instruction || instruction.mode !== "sandbox" || instruction.status !== "validated") {
    throw new Error("only validated sandbox instructions can be simulated");
  }
  return Object.freeze({
    ...instruction, status: "simulated",
    liveExecutionAllowed: false, fundsMoved: false
  });
}

export function assertLiveExecutionDisabled() {
  throw new Error("live execution is disabled; no transfer, signing, broadcast, debit or withdrawal can be initiated");
}

export function evaluateDebitOrderWindow(schedule, now = new Date().toISOString()) {
  if (!schedule || typeof schedule.id !== "string" || !schedule.id.trim()) {
    throw new TypeError("debit-order schedule id required");
  }
  if (schedule.status !== "scheduled") {
    return Object.freeze({ id: schedule.id, alert: "inactive", collectionInitiated: false });
  }
  const due = Date.parse(schedule.dueAt);
  const current = Date.parse(now);
  if (!Number.isFinite(due) || !Number.isFinite(current)) throw new TypeError("valid dueAt and now timestamps required");
  const alert = due > current ? "upcoming" : due === current ? "due" : "overdue";
  return Object.freeze({ id: schedule.id, alert, collectionInitiated: false });
}
