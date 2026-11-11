export type ChainFamily = "bitcoin" | "evm" | "solana";

export interface NetworkDescriptor {
  readonly id: string;
  readonly family: ChainFamily;
  readonly name: string;
  readonly chainId?: number;
  readonly environment: "mock" | "testnet" | "mainnet";
}

export interface WalletAccount {
  readonly id: string;
  readonly networkId: string;
  readonly address: string;
  readonly label?: string;
}

export interface AssetBalance {
  readonly networkId: string;
  readonly accountId: string;
  readonly assetId: string;
  readonly amountBaseUnits: string;
  readonly decimals: number;
}

export interface TransactionIntent {
  readonly networkId: string;
  readonly accountId: string;
  readonly recipient: string;
  readonly assetId: string;
  readonly amountBaseUnits: string;
}

export interface TransactionPreview {
  readonly intent: TransactionIntent;
  readonly estimatedFeeBaseUnits: string;
  readonly warnings: readonly string[];
  readonly signingAvailable: false;
  readonly broadcastingAvailable: false;
}

export interface WalletReadAdapter {
  readonly network: NetworkDescriptor;
  getAccounts(): Promise<readonly WalletAccount[]>;
  getBalances(accountId: string): Promise<readonly AssetBalance[]>;
  preview(intent: TransactionIntent): Promise<TransactionPreview>;
}
