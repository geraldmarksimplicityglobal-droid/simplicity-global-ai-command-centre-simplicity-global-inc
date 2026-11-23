---
name: mt-manager-android-engineering
description: Use when building, inspecting, modifying, testing, signing, verifying, packaging, or releasing Android applications with MT Manager, Android Studio, Gradle, APK/AAB tooling, ADB, or GEN SYSTEM.
---

# MT Manager & Android Engineering

## Purpose

Use this skill for the complete Android application lifecycle: project creation, source development, APK/AAB inspection, authorised resource editing, builds, tests, signing, certificate verification, device installation, and release evidence.

## Operating sequence

1. **Identify ownership and scope.** Confirm the application/package, repository, branch, intended changes, target SDK, distribution channel, and whether the operator owns the app or has written authorisation. Work only on applications you own or are explicitly authorised to assess.
2. **Inspect before changing.** Preserve the original APK/AAB and record its SHA-256, package name, version, permissions, SDK levels, signer certificate fingerprints, and source provenance. Use a copy for analysis and editing.
3. **Choose the right source of truth.** Prefer source code and Gradle for apps under development. Use MT Manager for supported on-device inspection and authorised resource-level work. Do not represent a binary-only edit as a reproducible source build.
4. **Edit within scope.** Record each manifest/resource/code change. Do not bypass security controls, licensing/DRM, or anti-tamper protections; do not inject hidden collection, impersonate another publisher, or alter apps without permission.
5. **Build reproducibly.** Use pinned Gradle/Android Gradle Plugin/Kotlin/SDK versions, dependency verification where practical, a clean build, and automated unit/instrumentation tests. Keep build outputs separate from source and original artifacts.
6. **Sign only owned release artifacts.** Use a dedicated release keystore stored outside the repository and protected by a managed secret store or secure secret store. Never commit any keystore or private signing key, password, signing properties file containing secrets, or signing output logs. Never reuse a third-party publisher's certificate.
7. **Verify before distribution.** Run `zipalign` before APK signing; sign with `apksigner`; verify with `apksigner verify --verbose --print-certs`; record SHA-256, certificate fingerprints, version, build commit, tool versions, and test results. A successful signature check proves cryptographic consistency, not that an app is benign.
8. **Release by approval.** Obtain explicit approval for each production signing, upload, store submission, or installation that changes a user's device. Separate reviewer and release operator for high-risk releases.

## MT Manager handoff

MT Manager is a third-party Android application. This project uses Android's Storage Access Framework and system Sharesheet as the integration boundary. Select an APK through the document picker, inspect it in the companion app, then use the share action and choose MT Manager if it is installed and offered by Android. Do not assume a package name, undocumented deep link, privileged API, or unattended MT Manager control. The operator completes any edit in MT Manager and returns the resulting file for independent inspection.

## APK and AAB distinctions

- APK: Android installable package. Align with `zipalign`, sign with `apksigner`, and verify with `apksigner`.
- AAB: Play publishing bundle. Build and sign it through the Gradle bundle task and configured Gradle signing configuration. `apksigner` is for APKs, not AAB signing.
- Editing an APK changes its bytes and normally invalidates its previous signature. A modified APK signed with a different key cannot update an installation signed by the original publisher. Do not promise upgrade compatibility unless the signing identity is legitimately controlled.
- Play App Signing may separate the upload key from the app-signing key. Preserve the distinction and never request or store Google's app-signing private key.

## Release signing controls

The SG Android build expects these environment variables for release signing:

- `SG_ANDROID_KEYSTORE_PATH`
- `SG_ANDROID_KEYSTORE_PASSWORD`
- `SG_ANDROID_KEY_ALIAS`
- `SG_ANDROID_KEY_PASSWORD`
- `SG_ANDROID_RELEASE_APPROVED=true` (set only after explicit approval for this release)

Set them in a protected local environment or CI secret store. Do not put their values in shell history, command arguments, Gradle properties committed to Git, logs, chat, or issue trackers. The Gradle release tasks fail closed if required values or the keystore file are missing, or if `SG_ANDROID_RELEASE_APPROVED=true` has not been set after approval. Debug builds use the Android debug key and are not production releases.

The release-policy helper constructs `apksigner` arguments using `env:` password references, rejects signing a debug variant, requires explicit per-release approval, rejects arbitrary third-party APKs, and requires a distinct output path. It prepares arguments; it does not itself execute a signing command.

## Device and installation controls

- Use ADB only against an identified, operator-authorised device.
- Inspect device identity and current installed package/version before installation.
- Never use `adb install -r` to overwrite an existing package unless the package identity, signing compatibility, backup/recovery plan, and explicit approval are established.
- Do not root, unlock bootloaders, bypass device protections, or install drivers/profiles without separate approval.
- Keep the phone's private signing keys off the device; use the phone as an inspection and workflow companion.

## Required release evidence

Each release record must contain: project/repository and commit, package ID, version name/code, min/target SDK, dependency/build tool versions, test outcomes, artifact SHA-256, signer certificate SHA-256, signature scheme verification, approval reference, distribution destination, and rollback/revocation notes. Do not include secret values.

## Quick commands

```bash
# Run repository-side policy tests
node --test tools/test/*.test.mjs

# Build a debug APK (Android SDK and Gradle required)
gradle :app:assembleDebug

# Build a Play bundle (release secrets and approval must be configured securely)
gradle :app:bundleRelease

# Verify a generated APK
apksigner verify --verbose --print-certs app-release.apk
```

## Limitations

The companion app currently inspects package metadata and signing-certificate fingerprints and provides a user-mediated MT Manager handoff. It does not modify APK contents, generate private keys, sign APKs on-device, control MT Manager internals, upload to Play Console, or claim malware safety. Those actions remain in the authorised workstation/CI release workflow and require separate approval.
