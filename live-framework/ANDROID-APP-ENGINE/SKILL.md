---
name: sg-android-app-engineering
description: Use when inspecting, editing, rebuilding, aligning, signing, verifying, testing, or releasing Android APK or AAB artifacts with MT Manager, Android SDK Build Tools, Gradle, ADB, or Play Console workflows.
---

# SG Android App Engine

## Scope
Complete-plus Android engineering: MT Manager-assisted inspection; authorized APK/AAB analysis and modification; Android source-project builds; signing and verification; device-test planning; release readiness and evidence.

## Guardrails
- **Plan-only by default.** This module does not execute shell commands, MT Manager, Gradle, Android SDK tools, ADB, installs, signing, or publishing.
- Work only on applications owned by the operator or covered by explicit authorization. No signature bypass, DRM/license circumvention, anti-tamper evasion, malware repackaging, or unauthorized access.
- Preserve the original artifact and SHA-256. All outputs use a distinct path.
- Never store or log private keys, keystores, passwords, tokens, or signing properties. Refer to secret-store entries only.
- Require separate, current, task/target/operation-scoped explicit approval for modifications, signing, device writes, installation, production signing and publication.
- Do not assume MT Manager, root, Android SDK, ADB, an emulator, or a connected device is available.

## Workflow
1. **Intake:** establish artifact type, source, owner/authorization, package ID, version, hash, signer metadata, device and tool availability.
2. **Inspect:** use MT Manager only if installed and explicitly selected; otherwise use appropriate read-only SDK inspection. Treat input archives and extracted files as untrusted.
3. **Choose path:** prefer authorized Gradle source builds. Binary APK edits are limited to explicitly authorized files. Preserve baseline and document diffs.
4. **APK:** build/modify → zipalign → apksigner sign → apksigner verify → alignment check. APK signing uses APK signature schemes supported by the selected Build Tools.
5. **AAB:** build bundle → configured upload-key signing (Gradle/bundle signing or jarsigner as appropriate) → verify signature and bundle metadata. AAB is not directly installable with adb install. Never conflate Play app-signing key and upload key.
6. **Test:** test on an approved emulator/device; verify package/version, install/update behavior, permissions, startup, critical flows and crash/ANR evidence. A changed signer normally prevents update over an existing app unless a valid compatible signing lineage applies.
7. **Release:** assemble release notes, dependency/SBOM inventory where available, privacy/permission review, test evidence, rollback artifact and approvals. Production signing and Play Console upload/publishing are separate approvals.
8. **Evidence:** record exact tool versions, commands planned, exit statuses when executed by an approved external runner, input/output hashes, signer fingerprints, test results and reviewer.

## Tool boundaries
| Tool | Use |
|---|---|
| MT Manager | Android-side file/archive/APK inspection and authorized edits; capability must be verified |
| Gradle / Android Gradle Plugin | Reproducible source builds with pinned versions |
| zipalign | Align APK before signing |
| apksigner | Sign and verify APKs |
| keytool | Inspect certificate metadata; do not export private key material |
| jarsigner | Verify/sign JAR-compatible AAB signing workflows |
| ADB | Device inventory and approved testing; read-only first |
| Play Console | Release handoff only after separate production approval |

## Stop conditions
Stop and report if authorization is absent, input/output hashes mismatch, signer identity is unexpected, signature verification fails, tool versions are unknown, target device is ambiguous, or evidence is incomplete. Never silently downgrade verification or overwrite the original.

## Task record
Require task ID, authorization basis, artifact path/type/hash, exact operation and target, output path, tool versions, approval scope and expiry for writes, verification steps, evidence location, rollback plan and final state.

## Status values
`design`, `read-only-inspection`, `plan-ready`, `approval-pending`, `approved-execution`, `verified`, `blocked`, `released`. Passing unit tests does not mean a device, signing key, toolchain, or production integration is live.
