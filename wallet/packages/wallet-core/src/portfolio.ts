import type { AssetBalance } from "./types.js";

/** Group raw base-unit balances by asset identifier without floating-point math. */
export function groupBalancesByAsset(
  balances: readonly AssetBalance[],
): ReadonlyMap<string, readonly AssetBalance[]> {
  const grouped = new Map<string, AssetBalance[]>();
  for (const balance of balances) {
    const entries = grouped.get(balance.assetId) ?? [];
    entries.push(balance);
    grouped.set(balance.assetId, entries);
  }
  return grouped;
}

/** Sum balances only when their asset and decimal precision match. */
export function sumBaseUnits(balances: readonly AssetBalance[]): string {
  const first = balances[0];
  if (first === undefined) return "0";
  for (const balance of balances) {
    if (balance.assetId !== first.assetId || balance.decimals !== first.decimals) {
      throw new Error("Cannot aggregate different assets or decimal precisions.");
    }
    if (!/^[0-9]+$/.test(balance.amountBaseUnits)) {
      throw new Error("Balance amount must be a non-negative integer string.");
    }
  }
  return balances.reduce((total, balance) => total + BigInt(balance.amountBaseUnits), 0n).toString();
}
