# SG-ANDROID-ENGINEERING-001 — Design

**Date:** 2026-11-23  
**Status:** Approved to proceed by explicit implementation instruction  
**Target:** Android only  
**Scope:** Complete Android application development and release system

## Intent

Provide Simplicity Global with a governed Android engineering capability covering project creation, source development, APK/AAB inspection, authorised MT Manager handoff, Gradle builds, tests, release signing, verification, and release evidence.

## Goals

- Create a native Android companion app for APK metadata and certificate inspection.
- Integrate MT Manager through Android's supported document and share intents, without assuming undocumented APIs.
- Provide a reproducible Gradle Android project.
- Add release-signing guards that keep key material out of source control and fail closed when signing configuration is incomplete.
- Add automated policy and Kotlin unit tests.
- Register the capability in the GEN SYSTEM integration roadmap.

## Non-goals

- No root access, bootloader unlock, signature bypass, DRM/licensing circumvention, malware deployment, or stealth modification.
- No unattended control of MT Manager internals.
- No production keystore generation or key provisioning in this build.
- No Play Console upload, app-store submission, or production deployment.
- No automatic installation or modification of an attached phone.

## Approaches considered

1. **MT Manager-only workflow:** fast for manual APK work, but not reproducible enough for complete application development, CI, or controlled signing.
2. **Workstation/CI-only Android pipeline:** reproducible and strong for builds/releases, but provides no useful Android-side inspection or MT Manager handoff.
3. **Hybrid native Android companion + Gradle/CI release pipeline:** chosen. It gives Android users a safe APK inspection and handoff surface while keeping private signing keys and production release operations in a controlled build environment.

## Architecture

- Android app: Kotlin, Jetpack Compose, Storage Access Framework, Sharesheet, PackageManager APK metadata and signing-certificate inspection.
- Build: Gradle Kotlin DSL, Android Gradle Plugin 8.7.3, Kotlin 2.0.21, compile/target SDK 35, min SDK 26, JDK 17.
- Signing: Gradle release signing from environment variables; release tasks fail closed unless all four required variables, the keystore file, and the explicit approval flag exist.
- Verification: `zipalign`, `apksigner verify`, SHA-256 artifact and certificate fingerprints.
- GEN SYSTEM: dedicated `ANDROID-ENGINEERING` workstream and integration-roadmap entry.

## Constraints and safety

- Android device and Windows workstation were offline during implementation. Device installation and on-device validation are therefore not claimed.
- No existing production signing certificate was inspected, changed, or created.
- MT Manager is treated as an external app; integration is user-mediated through standard Android intents.
- A modified APK normally loses its old signature. Re-signing with a new key does not preserve update compatibility with the original publisher's app.
- Source and original artifacts remain preserved; no external accounts are changed.

## Builder decisions

- Use a minimal native companion app rather than trying to embed or automate MT Manager.
- Keep private signing keys off the Android phone.
- Do not execute signing from the app; signing is a workstation/CI release operation.
- Use explicit approval for each production signing and distribution action.
