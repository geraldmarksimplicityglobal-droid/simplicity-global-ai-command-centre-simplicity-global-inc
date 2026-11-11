# SG Wallet readiness and implementation gaps

Status: repository-content update for branch `codex/sg-wallet-003-delivery-20261111`.

## Current repository inventory

The wallet subtree contains architecture/security documentation, Android/Termux and Windows integration READMEs, a Codex skill, a TypeScript workspace configuration, wallet-core interfaces and policy modules, a deterministic mock adapter, and offline unit-test source files.

Newly added code includes:
- Strict TypeScript workspace and package manifests.
- Non-secret account metadata validation and conversion.
- An explicit in-memory registry for read-only adapters.
- A local transaction lifecycle limited to draft, previewed, rejected, cancelled, and expired states.
- Unit-test source for account metadata, adapter registration, and preview-only lifecycle behavior.

## Remaining implementation gaps

1. **No test execution evidence.** Test source and scripts exist, but dependencies have not been installed and tests/type-check have not been run.
2. **No Android or Windows application source.** Platform directories remain integration specifications, not installable applications.
3. **No production chain adapters.** Bitcoin, EVM, and Solana remain architecture/network registry entries; the only adapter implementation is synthetic mock data.
4. **No key-management implementation.** No key generation, import/export, mnemonic handling, secure storage, signing, broadcasting, or custody service is implemented.
5. **No runtime compatibility evidence.** Android 10 and Windows 11 target environments and local checkout state have not been inspected from the physical devices.
6. **No package lockfile.** Dependency resolution and compatibility remain unverified.

## Next controlled stages

1. Obtain read-only environment and local-checkout evidence from Android/Termux and Windows.
2. Review package/toolchain compatibility before any dependency installation.
3. After separate approval, install dependencies and run type-check/tests in an isolated working copy.
4. Resolve compiler/test failures additively on a reviewed feature branch.
5. Design and review Android Keystore and Windows OS-backed storage independently before implementing key handling.
6. Add platform application shells after selecting a cross-platform framework from verified device constraints.
7. Implement live chain adapters only after separate network-access approval and security review.

## Hard gates

No dependency installation, build, test execution, local device connection, external RPC, WalletConnect, key operation, signing, broadcasting, real-funds operation, custodial backend, or deployment has been performed or is authorized by this code-scaffolding change.

## Evidence limitation

This is a GitHub repository-content change and inspection. It is not a scan of either physical device, a local working tree, hidden files, or uncommitted changes on those devices. No tests or compiler were executed in this turn.
