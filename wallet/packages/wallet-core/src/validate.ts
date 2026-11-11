import type { TransactionIntent } from "./types.js";

export function validateTransactionIntent(intent: TransactionIntent): string[] {
  const errors: string[] = [];
  if (!intent.networkId.trim()) errors.push("networkId is required");
  if (!intent.accountId.trim()) errors.push("accountId is required");
  if (!intent.recipient.trim()) errors.push("recipient is required");
  if (!intent.assetId.trim()) errors.push("assetId is required");
  if (!/^[0-9]+$/.test(intent.amountBaseUnits) || BigInt(intent.amountBaseUnits) <= 0n) {
    errors.push("amountBaseUnits must be a positive integer string");
  }
  return errors;
}
