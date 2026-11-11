# SG-CODEX-WALLET-001

Simplicity Global multi-chain wallet foundation for Android/Termux and Windows.

## Security posture
This repository stage is an architecture and mock-only foundation. It does not custody funds, derive production keys, sign transactions, broadcast transactions, connect to RPC providers, or contact WalletConnect.

## Architecture
- `packages/wallet-core`: chain-neutral domain contracts and transaction-intent validation.
- `packages/adapters/mock`: deterministic mock adapter for offline development.
- `apps/android-termux`: planned Android/Termux client integration.
- `apps/windows`: planned Windows client integration.
- `.codex/skills/sg-wallet-engineering`: Codex skill and safety protocol.

## Planned chain families
Bitcoin, EVM-compatible networks (Ethereum, Base, Polygon, Arbitrum, Optimism, BNB Chain), and Solana. Network adapters remain disabled until individually reviewed and approved.

## Development
Use a supported Node.js LTS release and the package manager selected after inspecting the target runtime. No dependency installation or execution is authorized by this foundation commit.

## Important
Never put seed phrases, private keys, keystore files, credentials, or recovery material in source control, logs, issue trackers, or chat.
