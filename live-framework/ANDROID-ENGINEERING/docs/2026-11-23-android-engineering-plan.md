# SG-ANDROID-ENGINEERING-001 — Implementation Plan

## Task 1 — Release policy tests
- Add Node built-in tests for required signing variables, secret redaction, release-only signing, approval, project-artifact boundary, argument construction, and distinct output path.
- Run tests before implementation and confirm the missing module causes the expected RED failure.
- Implement the minimal policy helper and rerun to GREEN.

## Task 2 — Android project scaffold
- Add Gradle settings/root plugins, Android app module, manifest, resources, and ProGuard rules.
- Pin SDK/toolchain versions and use Java 17.
- Add CI workflow that installs Android SDK 35/build tools and runs unit tests plus debug assembly.

## Task 3 — APK inspection companion
- Implement SAF APK selection.
- Copy selected content URI into app cache only for inspection and delete the temporary file in `finally`.
- Use PackageManager archive metadata to report package/version and signer SHA-256 fingerprints.
- Add Sharesheet handoff for operator-selected MT Manager.
- Request no broad storage permissions.

## Task 4 — Signing safeguards
- Add Gradle release signing from protected environment variables only.
- Make `assembleRelease` and `bundleRelease` depend on a fail-closed signing preflight.
- Add CLI argument builder that references password environment variables rather than embedding password values.
- Reject debug signing, missing approval, non-project artifacts, and in-place overwrite.

## Task 5 — Tests and evidence
- Add Kotlin unit tests for certificate fingerprint formatting and empty input.
- Add Node tests for release policy and skill safety contract.
- Run Node tests locally. Android Gradle tests/build require an Android SDK and Gradle installation; CI is configured but its run must be checked separately.

## Task 6 — GEN SYSTEM integration
- Add Android Engineering README, capability manifest, and MT Manager/Android engineering skill.
- Add `SG-INT-006` to the integration roadmap with current state and activation gates.
- Keep the implementation on `codex/sg-android-engineering-001`; do not merge or deploy.

## Task 7 — Review and activation
- Review repository diff and secret handling.
- Verify CI result before claiming Android compilation success.
- Connect an authorised Android device and workstation separately before installation or live device testing.
- Obtain separate approval before provisioning a production keystore, signing production releases, or publishing.
