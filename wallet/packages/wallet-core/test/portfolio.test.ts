import test from "node:test";
import assert from "node:assert/strict";
import { groupBalancesByAsset, sumBaseUnits } from "../src/portfolio.js";
import type { AssetBalance } from "../src/types.js";

const balances: AssetBalance[] = [
  { networkId: "n1", accountId: "a1", assetId: "TOKEN", amountBaseUnits: "10", decimals: 2 },
  { networkId: "n2", accountId: "a2", assetId: "TOKEN", amountBaseUnits: "25", decimals: 2 },
];

test("groups balances by asset without converting base units", () => {
  assert.equal(groupBalancesByAsset(balances).get("TOKEN")?.length, 2);
});

test("sums compatible base-unit balances with integer precision", () => {
  assert.equal(sumBaseUnits(balances), "35");
  assert.equal(sumBaseUnits([]), "0");
});

test("rejects mixed assets, decimal precision and malformed values", () => {
  assert.throws(() => sumBaseUnits([
    balances[0]!,
    { ...balances[1]!, assetId: "OTHER" },
  ]), /different assets/);
  assert.throws(() => sumBaseUnits([
    balances[0]!,
    { ...balances[1]!, decimals: 3 },
  ]), /different assets/);
  assert.throws(() => sumBaseUnits([
    { ...balances[0]!, amountBaseUnits: "1.2" },
  ]), /non-negative integer/);
});
