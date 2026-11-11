import type { ChainFamily } from "./types.js";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const EVM_HEX = /^0x[0-9a-fA-F]{40}$/;

/**
 * Syntactic screening only. This does not verify checksums, ownership,
 * network-specific scripts, token contracts, or address activity.
 */
export function hasPlausibleAddressFormat(family: ChainFamily, address: string): boolean {
  const value = address.trim();
  if (!value) return false;

  switch (family) {
    case "evm":
      return EVM_HEX.test(value);
    case "bitcoin":
      return /^(bc1|tb1)[a-z0-9]{11,87}$/i.test(value)
        || /^[13mn2][1-9A-HJ-NP-Za-km-z]{25,60}$/.test(value);
    case "solana":
      return value.length >= 32 && value.length <= 44 && BASE58.test(value);
  }
}
