import test from "node:test";
import assert from "node:assert/strict";
import { toWalletAccount, validateAccountMetadata } from "../src/account-policy.js";

test("accepts non-secret account metadata", () => {
  const metadata = { id: "acct-1", family: "evm" as const, address: "0xabc", label: "Main" };
  assert.deepEqual(validateAccountMetadata(metadata), []);
  assert.equal(toWalletAccount(metadata, "mock-evm-1").networkId, "mock-evm-1");
});

test("rejects blank account identifiers and addresses", () => {
  assert.equal(validateAccountMetadata({ id: " ", family: "bitcoin", address: " " }).length, 2);
});
