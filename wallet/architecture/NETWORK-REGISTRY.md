# SG Wallet network registry

Status: specification only. Every entry below is disabled until separately reviewed and approved.

| Network ID | Family | Environment at initial build | Notes |
|---|---|---|---|
| bitcoin-mainnet | Bitcoin | disabled | Mainnet interaction prohibited in current scope |
| bitcoin-testnet | Bitcoin | mock only | Use deterministic fixtures until testnet access is approved |
| ethereum-mainnet | EVM | disabled | Chain ID 1 |
| ethereum-sepolia | EVM | mock only | Chain ID 11155111 |
| base-mainnet | EVM | disabled | Chain ID 8453 |
| base-sepolia | EVM | mock only | Chain ID 84532 |
| polygon-mainnet | EVM | disabled | Chain ID 137 |
| polygon-amoy | EVM | mock only | Chain ID 80002 |
| arbitrum-one | EVM | disabled | Chain ID 42161 |
| arbitrum-sepolia | EVM | mock only | Chain ID 421614 |
| optimism-mainnet | EVM | disabled | Chain ID 10 |
| optimism-sepolia | EVM | mock only | Chain ID 11155420 |
| bnb-smart-chain | EVM | disabled | Chain ID 56 |
| bnb-testnet | EVM | mock only | Chain ID 97 |
| solana-mainnet | Solana | disabled | Mainnet interaction prohibited in current scope |
| solana-devnet | Solana | mock only | Use deterministic fixtures until testnet access is approved |

## Adapter contract

Each adapter must declare a stable network ID, chain family, chain-native identifier, environment, address validator, fee model, transaction previewer, and read-only capabilities. The core must reject an intent if its network ID does not exactly match the adapter.

## Mandatory safety invariants

- Mock is the only enabled provider mode at this stage.
- Never infer mainnet from a missing network identifier.
- No RPC, indexer, bridge, exchange, WalletConnect, hardware signer, or payment provider connection.
- No key generation/import/export, signing, broadcast, or custody.
- Test fixtures must be visibly labelled synthetic.
