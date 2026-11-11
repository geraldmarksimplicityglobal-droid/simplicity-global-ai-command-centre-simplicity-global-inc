import type { TransactionIntent, TransactionPreview } from "./types.js";

export type TransactionStatus =
  | "draft"
  | "previewed"
  | "rejected"
  | "cancelled"
  | "expired";

export interface TransactionRecord {
  readonly id: string;
  readonly status: TransactionStatus;
  readonly intent: TransactionIntent;
  readonly preview?: TransactionPreview;
  readonly reason?: string;
}

/**
 * Local workflow state only. This state machine deliberately has no signing,
 * broadcasting, provider, persistence, or real-funds operations.
 */
export function attachPreview(
  record: TransactionRecord,
  preview: TransactionPreview,
): TransactionRecord {
  if (record.status !== "draft") {
    throw new Error("A preview can only be attached to a draft.");
  }
  if (preview.intent.networkId !== record.intent.networkId ||
      preview.intent.accountId !== record.intent.accountId ||
      preview.intent.recipient !== record.intent.recipient ||
      preview.intent.assetId !== record.intent.assetId ||
      preview.intent.amountBaseUnits !== record.intent.amountBaseUnits) {
    throw new Error("Preview does not match the transaction intent.");
  }
  if (preview.signingAvailable !== false || preview.broadcastingAvailable !== false) {
    throw new Error("This wallet build accepts preview-only results.");
  }
  return { ...record, status: "previewed", preview };
}

export function closeTransaction(
  record: TransactionRecord,
  action: "reject" | "cancel" | "expire",
  reason?: string,
): TransactionRecord {
  if (record.status === "rejected" ||
      record.status === "cancelled" ||
      record.status === "expired") {
    throw new Error("Transaction is already closed.");
  }
  const status: TransactionStatus = {
    reject: "rejected",
    cancel: "cancelled",
    expire: "expired",
  }[action];
  return {
    id: record.id,
    status,
    intent: record.intent,
    ...(record.preview === undefined ? {} : { preview: record.preview }),
    ...(reason === undefined ? {} : { reason }),
  };
}
