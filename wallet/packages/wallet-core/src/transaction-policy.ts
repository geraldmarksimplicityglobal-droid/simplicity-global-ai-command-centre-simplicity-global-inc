import type { NetworkDescriptor, TransactionIntent, WalletAccount } from "./types.js";
import { validateTransactionIntent } from "./validate.js";

/**
 * Validates metadata before preview. It never signs, broadcasts, estimates fees,
 * contacts a provider, or mutates wallet state.
 */
export function validateIntentForPreview(
  intent: TransactionIntent,
  network: NetworkDescriptor,
  account: WalletAccount,
): string[] {
  const errors = validateTransactionIntent(intent);
  if (intent.networkId !== network.id) errors.push("Intent network does not match selected network.");
  if (account.networkId !== network.id) errors.push("Account network does not match selected network.");
  if (intent.accountId !== account.id) errors.push("Intent account does not match selected account.");
  if (network.environment === "mainnet") errors.push("Mainnet preview is disabled in the current build scope.");
  return errors;
}
