import test from "node:test";
import assert from "node:assert/strict";
import { attachPreview, closeTransaction } from "../src/transaction-lifecycle.js";
import type { TransactionIntent, TransactionRecord, TransactionPreview } from "../src/types.js";

const intent: TransactionIntent = {
  networkId: "mock-evm-1",
  accountId: "mock-account-1",
  recipient: "0x0000000000000000000000000000000000000002",
  assetId: "MOCK",
  amountBaseUnits: "10",
};
const draft: TransactionRecord = { id: "tx-1", status: "draft", intent };
const preview: TransactionPreview = {
  intent,
  estimatedFeeBaseUnits: "21000",
  warnings: ["MOCK ONLY"],
  signingAvailable: false,
  broadcastingAvailable: false,
};

test("attaches a matching preview without enabling signing or broadcasting", () => {
  const result = attachPreview(draft, preview);
  assert.equal(result.status, "previewed");
  assert.equal(result.preview?.signingAvailable, false);
  assert.equal(result.preview?.broadcastingAvailable, false);
});

test("rejects a preview for a different intent", () => {
  const mismatched = { ...preview, intent: { ...intent, amountBaseUnits: "11" } };
  assert.throws(() => attachPreview(draft, mismatched), /does not match/);
});

test("allows explicit local cancellation and prevents reopening a closed record", () => {
  const cancelled = closeTransaction(draft, "cancel", "User cancelled locally");
  assert.equal(cancelled.status, "cancelled");
  assert.throws(() => closeTransaction(cancelled, "expire"), /already closed/);
});
