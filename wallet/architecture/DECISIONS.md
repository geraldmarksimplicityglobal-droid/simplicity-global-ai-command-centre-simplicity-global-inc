# Architecture decisions — SG-CODEX-WALLET-001

## ADR-001: Separate custody models
Self-custody and custodial wallets are separate bounded contexts. Self-custody signing must remain on a user-controlled device or approved hardware signer. Custodial signing requires a separately authorized backend, threat model, operational controls, and legal/compliance review.

## ADR-002: Chain adapter boundary
The core uses chain-neutral account metadata, network descriptors, balances, transaction records, and transaction intents. Chain-specific address formats, fee models, serialization, and signing remain inside audited adapters.

## ADR-003: Offline-first development
The default provider is a deterministic mock. Live RPC, indexers, WalletConnect, hardware devices, and exchange services are disabled until explicit approval.

## ADR-004: Human approval
The application may prepare and display a transaction intent. It must not sign or broadcast. A future separately approved signing flow must show network, chain ID, asset, amount, destination, fee, contract/calldata summary, and simulation status before a distinct user confirmation.

## ADR-005: Cross-platform clients
Share domain contracts and validation between Android/Termux and Windows clients. Keep OS keystore integration platform-specific and never fall back silently to plaintext storage.
