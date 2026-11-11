import type { AssetBalance, TransactionIntent, TransactionPreview, WalletAccount, WalletReadAdapter, NetworkDescriptor } from "../../../wallet-core/src/types.js";
import { validateTransactionIntent } from "../../../wallet-core/src/validate.js";

export class MockWalletAdapter implements WalletReadAdapter {
  readonly network: NetworkDescriptor = {
    id: "mock-evm-1",
    family: "evm",
    name: "Mock EVM",
    chainId: 31337,
    environment: "mock",
  };

  async getAccounts(): Promise<readonly WalletAccount[]> {
    return [{ id: "mock-account-1", networkId: this.network.id, address: "0x0000000000000000000000000000000000000001", label: "Demo account" }];
  }

  async getBalances(accountId: string): Promise<readonly AssetBalance[]> {
    if (accountId !== "mock-account-1") return [];
    return [{ networkId: this.network.id, accountId, assetId: "MOCK", amountBaseUnits: "100000000", decimals: 6 }];
  }

  async preview(intent: TransactionIntent): Promise<TransactionPreview> {
    const errors = validateTransactionIntent(intent);
    if (errors.length) throw new Error(errors.join("; "));
    if (intent.networkId !== this.network.id) throw new Error("Network mismatch");
    return {
      intent,
      estimatedFeeBaseUnits: "21000",
      warnings: ["MOCK ONLY: no signing, broadcast, or network request is performed."],
      signingAvailable: false,
      broadcastingAvailable: false,
    };
  }
}
