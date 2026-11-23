# SG Android Engineering

**System ID:** `SG-ANDROID-ENGINEERING-001`  
**Skill ID:** `SG-SKILL-BUILD-001`  
**Target:** Android

A governed Android application engineering system for source development, APK/AAB inspection, MT Manager handoff, Gradle builds, testing, signing, verification, and release evidence.

## Modules
- `app/` — native Kotlin/Jetpack Compose inspection companion.
- `tools/release-policy.mjs` — release-signing policy and safe `apksigner` argument builder.
- `tools/test/` — Node policy tests and skill contract tests.
- `skills/mt-manager-android-engineering/SKILL.md` — reusable GEN SYSTEM skill guide.
- `docs/` — design, implementation plan, and release evidence template.

## Build
Requirements: JDK 17, Gradle 8.9, Android SDK Platform 35 and Build Tools 35.0.0.

```bash
node --test tools/test/*.test.mjs
gradle :app:testDebugUnitTest :app:assembleDebug
```

GitHub Actions is configured to install the Android SDK and run Kotlin unit tests plus debug assembly.

## Release signing
Release signing is blocked unless all of these variables are configured in a protected environment and the keystore exists:
- `SG_ANDROID_KEYSTORE_PATH`
- `SG_ANDROID_KEYSTORE_PASSWORD`
- `SG_ANDROID_KEY_ALIAS`
- `SG_ANDROID_KEY_PASSWORD`
- `SG_ANDROID_RELEASE_APPROVED=true` (only after explicit per-release approval)

Never commit a keystore or secret. A release build is not a production release until the artifact is independently verified and explicitly approved.

## MT Manager
The companion selects APKs through SAF and uses Android's system Sharesheet for a human-controlled handoff. It does not assume undocumented MT Manager APIs or modify APKs itself.

## Verification boundary
GitHub Actions verified 12/12 Node policy/skill tests, Kotlin unit tests, and `:app:assembleDebug` successfully. Device installation and MT Manager handoff have not been tested on a connected device. No production signing key has been provisioned and no release has been signed or published.
