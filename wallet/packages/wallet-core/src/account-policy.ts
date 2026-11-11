import type { ChainFamily, WalletAccount } from "./types.js";

export interface AccountMetadata {
  readonly id: string;
  readonly family: ChainFamily;
  readonly address: string;
  readonly label?: string;
}

/**
 * Checks display/account metadata only. It does not derive, import, validate
 * cryptographic ownership of, or access keys for an address.
 */
export function validateAccountMetadata(account: AccountMetadata): string[] {
  const errors: string[] = [];
  if (!account.id.trim()) errors.push("Account id is required.");
  if (!account.address.trim()) errors.push("Account address is required.");
  if (account.label !== undefined && !account.label.trim()) {
    errors.push("Account label must not be blank when supplied.");
  }
  return errors;
}

export function toWalletAccount(
  account: AccountMetadata,
  networkId: string,
): WalletAccount {
  const errors = validateAccountMetadata(account);
  if (!networkId.trim()) errors.push("Network id is required.");
  if (errors.length) throw new Error(errors.join(" "));
  return {
    id: account.id,
    networkId,
    address: account.address,
    ...(account.label === undefined ? {} : { label: account.label }),
  };
}
