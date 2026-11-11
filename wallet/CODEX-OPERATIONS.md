# SG Wallet Codex operations protocol

## Mission

Continue the Simplicity Global multi-chain wallet foundation without bypassing operator controls.

## Before every task

1. Identify repository, current branch, base commit, and target paths.
2. Inspect the full target subtree and read every file that may be affected.
3. Check for existing local modifications where local workspace access is available.
4. Produce a change plan listing additions, modifications, deletions, dependencies, and external effects.
5. Stop if scope, custody model, network, or required permissions are unclear.

## Default execution profile

- Mode: inspect / specification / mock-only.
- Network: offline.
- Funds: synthetic only.
- Key access: prohibited.
- Signing and broadcast: prohibited.
- External providers: disabled.
- Installation, build, and deployment: approval required.
- File policy: additive; preserve existing files and uncommitted work.

## Transaction safety

The current foundation may validate and preview a transaction intent only. It must not sign, broadcast, or contact a network. A future approved signing workflow must independently verify chain/network, account, destination, asset, amount, fees, nonce, contract/calldata, simulation and expiry, then require explicit user confirmation immediately before signing and a separate confirmation before broadcasting.

## Custody separation

Self-custody and custodial services are separate bounded contexts. Never share key storage or signing code. Custodial services require a separately approved backend, key-management design, threat model, legal/compliance review, operational controls, auditability, and incident response.

## Evidence report format

- SYSTEM OBJECT
- Branch and base commit
- Files added / modified / deleted
- Commands executed (or NOT EXECUTED)
- Tests run and results (or NOT RUN)
- External connections (or NONE)
- Security controls and unresolved risks
- Next approval gate

## Stop conditions

Stop before any secret access, key operation, real-fund operation, live network call, dependency installation, destructive edit, production deployment, or permission change that has not been separately approved.
