import test from "node:test";
import assert from "node:assert/strict";
import { validateTransactionIntent } from "../src/validate.js";
import { validateIntentForPreview } from "../src/transaction-policy.js";
import { getNetwork, listAvailableMockNetworks } from "../src/network-registry.js";
import type { TransactionIntent, WalletAccount } from "../src/types.js";

const validIntent: TransactionIntent = {
  networkId: "mock-evm-1",
  accountId: "mock-account-1",
  recipient: "0x0000000000000000000000000000000000000002",
  assetId: "MOCK",
  amountBaseUnits: "1",
};

test("accepts a well-formed positive integer intent", () => {
  assert.deepEqual(validateTransactionIntent(validIntent), []);
});

test("rejects zero, negative, decimal, and non-numeric amounts", () => {
  for (const amountBaseUnits of ["0", "-1", "1.5", "abc"]) {
    assert.ok(validateTransactionIntent({ ...validIntent, amountBaseUnits }).length > 0);
  }
});

test("network registry never enables mainnet", () => {
  assert.ok(getNetwork("ethereum-mainnet")?.availability === "disabled");
  assert.ok(listAvailableMockNetworks().every((network) => network.availability === "mock-only"));
});

test("preview policy rejects mainnet and account/network mismatches", () => {
  const account: WalletAccount = {
    id: "mock-account-1",
    networkId: "mock-evm-1",
    address: "0x0000000000000000000000000000000000000001",
  };
  const mainnet = getNetwork("ethereum-mainnet")!;
  assert.ok(validateIntentForPreview(
    { ...validIntent, networkId: mainnet.id },
    mainnet,
    { ...account, networkId: mainnet.id },
  ).some((error) => error.includes("Mainnet")));
  assert.ok(validateIntentForPreview(validIntent, getNetwork("ethereum-sepolia")!, account).length > 0);
});
