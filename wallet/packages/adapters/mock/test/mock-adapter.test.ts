import test from "node:test";
import assert from "node:assert/strict";
import { MockWalletAdapter } from "../src/mock-adapter.js";

test("mock adapter returns deterministic synthetic account and balance", async () => {
  const adapter = new MockWalletAdapter();
  const [account] = await adapter.getAccounts();
  assert.ok(account);
  assert.equal(account.id, "mock-account-1");
  assert.equal(account.networkId, adapter.network.id);
  const balances = await adapter.getBalances(account.id);
  assert.equal(balances.length, 1);
  assert.equal(balances[0]?.amountBaseUnits, "100000000");
});

test("mock preview never enables signing or broadcasting", async () => {
  const adapter = new MockWalletAdapter();
  const preview = await adapter.preview({
    networkId: adapter.network.id,
    accountId: "mock-account-1",
    recipient: "0x0000000000000000000000000000000000000002",
    assetId: "MOCK",
    amountBaseUnits: "1",
  });
  assert.equal(preview.signingAvailable, false);
  assert.equal(preview.broadcastingAvailable, false);
});

test("mock adapter rejects a network mismatch", async () => {
  const adapter = new MockWalletAdapter();
  await assert.rejects(() => adapter.preview({
    networkId: "ethereum-mainnet",
    accountId: "mock-account-1",
    recipient: "0x0000000000000000000000000000000000000002",
    assetId: "MOCK",
    amountBaseUnits: "1",
  }), /Network mismatch/);
});
