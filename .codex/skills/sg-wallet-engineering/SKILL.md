---
name: sg-wallet-engineering
description: Build and review the Simplicity Global multi-chain wallet with strict custody, signing, and network safety gates.
---

# SG Wallet Engineering

## Required operating protocol
1. Inspect repository structure, branch, working-tree context when available, and existing conventions before editing.
2. Preserve existing files and uncommitted work. Add new files rather than replacing existing ones unless explicitly approved.
3. Default to offline mock providers. Never initiate RPC, WalletConnect, hardware-wallet, exchange, payment, or other external connections without separate approval.
4. Never request, print, log, commit, transmit, or expose seed phrases, private keys, keystore passwords, recovery shares, or API secrets.
5. Never sign or broadcast a real transaction. A human must review the chain, network, recipient, asset, amount, fees, calldata/contract, nonce, and simulation result and separately approve signing and broadcasting.
6. Keep custodial and self-custody implementations separate. Custodial functionality requires a separately reviewed server-side key-management and compliance design; do not store customer keys in ordinary application storage.
7. Use audited cryptographic libraries. Do not invent cryptography, key derivation, mnemonic handling, or transaction serialization.
8. Keep chain adapters isolated behind typed interfaces. Chain IDs and network identifiers must be explicit; prevent mainnet/testnet confusion.
9. Add unit tests for validation, state transitions, replay/idempotency, malformed inputs, and failure paths. Tests must use deterministic fixtures and mocks.
10. Report exactly what changed, what was tested, what was not tested, and any remaining risks.

## Supported initial scope
- Multi-chain adapter contracts for Bitcoin, EVM networks, and Solana.
- Non-secret account/address metadata.
- Read-only portfolio and transaction-history interfaces.
- Transaction intent preview with no signing or broadcast.
- Mock mode by default.

## Stop conditions
Stop and request approval if a task requires secrets, real funds, live network access, signing, broadcasting, account changes, production deployment, dependency installation, or destructive edits.
