# SG-CODEX-WALLET-001 implementation plan

## Scope

Multi-chain wallet foundation for Android/Termux and Windows Codex workflows, with distinct self-custody and custodial bounded contexts.

## Delivery stages

| Stage | Work | Exit evidence |
|---|---|---|
| 1. Foundation | Existing domain types, validation, mock adapter, Codex skill | File inventory and review |
| 2. Core | Network registry, account metadata, balances, transaction intent and preview | Unit tests with deterministic fixtures |
| 3. Security | Threat model, custody separation, secure-storage interfaces | Security review; no secrets in logs or source |
| 4. Adapters | Bitcoin, EVM, Solana adapter contracts | Contract tests; mock-only |
| 5. Clients | Android/Termux and Windows presentation integration | Platform compatibility review |
| 6. Verification | Validation, malformed inputs, replay/idempotency, state transitions, failure paths | Test report and risk register |

## Release gates

- No real funds, mainnet access, external RPC, WalletConnect, exchange, payment or hardware-wallet connection in the current scope.
- No private-key or seed-phrase generation, import, export, display, or storage.
- No transaction signing or broadcasting.
- Dependency installation and builds require separate approval.
- Production custody requires separate architecture, legal/compliance, operational, and security approval.

## Current evidence

The foundation branch contains a Codex skill, architecture decisions, security boundaries, chain-neutral TypeScript types, transaction-intent validation, and a deterministic mock adapter. No test execution or build is claimed.
