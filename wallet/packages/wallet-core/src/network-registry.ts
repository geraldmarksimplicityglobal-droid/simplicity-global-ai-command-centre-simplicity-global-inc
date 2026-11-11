import type { NetworkDescriptor } from "./types.js";

/**
 * Descriptors are metadata only. "disabled" networks are never contacted.
 * Mock/testnet entries do not enable live provider access.
 */
export type NetworkAvailability = "mock-only" | "disabled";

export interface RegisteredNetwork extends NetworkDescriptor {
  readonly availability: NetworkAvailability;
}

export const NETWORKS: readonly RegisteredNetwork[] = [
  { id: "bitcoin-mainnet", family: "bitcoin", name: "Bitcoin", environment: "mainnet", availability: "disabled" },
  { id: "bitcoin-testnet", family: "bitcoin", name: "Bitcoin Testnet", environment: "testnet", availability: "mock-only" },
  { id: "ethereum-mainnet", family: "evm", name: "Ethereum", chainId: 1, environment: "mainnet", availability: "disabled" },
  { id: "ethereum-sepolia", family: "evm", name: "Ethereum Sepolia", chainId: 11155111, environment: "testnet", availability: "mock-only" },
  { id: "base-mainnet", family: "evm", name: "Base", chainId: 8453, environment: "mainnet", availability: "disabled" },
  { id: "base-sepolia", family: "evm", name: "Base Sepolia", chainId: 84532, environment: "testnet", availability: "mock-only" },
  { id: "polygon-mainnet", family: "evm", name: "Polygon", chainId: 137, environment: "mainnet", availability: "disabled" },
  { id: "polygon-amoy", family: "evm", name: "Polygon Amoy", chainId: 80002, environment: "testnet", availability: "mock-only" },
  { id: "arbitrum-one", family: "evm", name: "Arbitrum One", chainId: 42161, environment: "mainnet", availability: "disabled" },
  { id: "arbitrum-sepolia", family: "evm", name: "Arbitrum Sepolia", chainId: 421614, environment: "testnet", availability: "mock-only" },
  { id: "optimism-mainnet", family: "evm", name: "Optimism", chainId: 10, environment: "mainnet", availability: "disabled" },
  { id: "optimism-sepolia", family: "evm", name: "Optimism Sepolia", chainId: 11155420, environment: "testnet", availability: "mock-only" },
  { id: "bnb-smart-chain", family: "evm", name: "BNB Smart Chain", chainId: 56, environment: "mainnet", availability: "disabled" },
  { id: "bnb-testnet", family: "evm", name: "BNB Testnet", chainId: 97, environment: "testnet", availability: "mock-only" },
  { id: "solana-mainnet", family: "solana", name: "Solana", environment: "mainnet", availability: "disabled" },
  { id: "solana-devnet", family: "solana", name: "Solana Devnet", environment: "testnet", availability: "mock-only" },
] as const;

export function getNetwork(id: string): RegisteredNetwork | undefined {
  return NETWORKS.find((network) => network.id === id);
}

export function listAvailableMockNetworks(): readonly RegisteredNetwork[] {
  return NETWORKS.filter((network) => network.availability === "mock-only");
}
