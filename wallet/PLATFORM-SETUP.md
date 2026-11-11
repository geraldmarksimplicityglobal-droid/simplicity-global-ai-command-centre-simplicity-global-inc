# SG Wallet platform setup package

Status: preparation specification only. This is not an installer, APK, Windows executable, or deployment package.

## Shared baseline

- Runtime selection remains pending compatibility review. Do not assume a framework or package manager before inspecting the host environment.
- Keep shared wallet domain contracts separate from platform UI and platform secure-storage adapters.
- Start in offline mock mode. Synthetic balances and addresses must be visibly marked DEMO.
- No production keys, real funds, transaction signing, broadcasting, RPC, WalletConnect, exchange, payment, or hardware-wallet integration is included.

## Android / Termux target

Target baseline: Huawei P30 Pro (ELE-L29), Android 10, ARM64, Termux home at /data/data/com.termux/files/home/.

1. Inspect Android API level, available runtime, storage constraints, and existing project files before selecting a framework.
2. Preserve the user's existing Termux files and uncommitted changes.
3. Keep the Termux developer workflow separate from the end-user Android UI.
4. Design a future Android Keystore adapter; if secure storage is unavailable, block key operations rather than using plaintext files.
5. No ADB, USB, Wi-Fi, remote-control, package installation, build, APK assembly, or device installation is performed by this package.

## Windows / Codex target

Target baseline: HP 250 G10, Windows 11 Enterprise.

1. Inspect OS health, runtime versions, repository state, and available disk space before implementation.
2. Preserve existing files, local changes, and credentials. Never print or copy secrets into the repository.
3. Use Codex skill instructions for inspect-first changes and evidence reporting.
4. Design future secure storage around a reviewed Windows OS-backed credential/key facility; never silently fall back to plaintext.
5. No shell execution, dependency installation, service/firewall changes, credential access, build, signing, or deployment is performed by this package.

## Approval gates

Separate approval is required for: runtime/framework selection; dependency installation; local file modifications; builds/tests on either device; device bridges; live RPC or other external connections; key generation/import/export/storage; custodial backend provisioning; signing; broadcasting; and production deployment.

## Evidence required before calling a platform build complete

- Exact repository commit and file inventory
- Host OS/runtime compatibility report
- Dependency inventory and license review
- Unit and security test results
- Secure-storage design review
- Explicit list of disabled capabilities
- Operator approval record for every gated action
