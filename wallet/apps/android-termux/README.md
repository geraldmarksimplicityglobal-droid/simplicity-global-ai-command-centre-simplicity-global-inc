# Android / Termux client

Target device baseline: Android 10, ARM64 (Huawei P30 Pro / ELE-L29). This directory is a client integration specification, not an installable APK.

## Proposed layers

1. Shared wallet domain package: chain-neutral types, validation, mock data.
2. Android presentation client: account list, asset list, transaction preview, security state.
3. Secure-storage boundary: future Android Keystore integration; no plaintext fallback.
4. Termux developer workflow: source inspection and tests only after the operator approves local execution.

## Constraints

- No device bridge, ADB, USB, Wi-Fi, remote-control, or network connection is initiated by this package.
- No package installation, build, signing, APK assembly, or device installation is performed.
- No seed phrase, private key, recovery code, or password is stored in Termux files.
- Android 10 support must be validated against the chosen framework and dependency support matrix before selecting an app stack.
- All provider calls remain mocked.
