---
name: sg-mt-manager-android-signing
description: Use when inspecting, editing, rebuilding, aligning, verifying or signing Android APKs with MT Manager, Termux or Android SDK build tools, including Android app release preparation and certificate checks.
---

# SG MT Manager & Android App Signing Skill

## Purpose

Provide a governed Android APK workflow for Simplicity Global. MT Manager is treated as an installed third-party Android application with a user-operated interface. GEN SYSTEM coordinates approved inspection and build-tool operations; it does not assume a private MT Manager API or silently automate UI actions.

## Capability boundaries

- Support Android and Termux as a constrained execution target.
- Discover the Android device, installed MT Manager package identifier and available toolchain before use.
- Inspect APK metadata, manifests, DEX entries, package badging, alignment and signatures.
- Prepare decompile, rebuild, zipalign and signing invocations using fixed executable allowlists and argument arrays.
- Launch MT Manager only after its installed package ID has been discovered and the user has approved the launch.
- Keep signing-key material outside repositories, task payloads, prompts, logs and generated artifacts.
- A device must be connected and verified before any live operation. Source availability does not mean MT Manager or any APK tool is installed. Do not claim that Android is connected, MT Manager is installed, a command ran, or an APK was modified unless fresh device evidence confirms it.

## Android preflight

1. Verify the Android/Termux runtime connection and record the device identity without collecting personal account data.
2. Read the Android API level, architecture, Termux version and available storage using read-only queries.
3. Query installed packages and identify the MT Manager package ID from actual device output. Do not assume a package name.
4. Probe each required executable independently: apkanalyzer, aapt, apktool, zipalign, apksigner, which, pm and monkey.
5. Record missing tools as unavailable. Do not install packages, change Android settings, enable debugging, accept Trust prompts or grant storage permissions without separate approval.
6. Confirm the APK and all working outputs are within an explicitly approved workspace. Resolve symlinks and canonical paths in the actual executor before any write.

## MT Manager workflow

1. Use the list-packages operation to obtain the actual installed package list.
2. Ask the operator to identify the MT Manager package ID from the returned list if it is not unambiguous.
3. Launch only the exact package ID recorded by the discovery step, using the scoped launch-mt-manager operation.
4. The user performs APK Editor actions in MT Manager. GEN SYSTEM may prepare instructions and validate resulting artifacts, but does not infer private UI endpoints or bypass Android permissions.
5. Preserve the original APK. Save edited output under a new filename and record its SHA-256 before further processing.

## APK inspection

Use read-only operations first:

- inspect-apk: application summary through apkanalyzer.
- inspect-manifest: decoded manifest through apkanalyzer.
- inspect-dex: DEX entry listing through apkanalyzer.
- dump-badging: package metadata through aapt.
- verify-alignment: alignment check through zipalign.
- verify-signature: certificate and signature verification through apksigner.

Record the input path, SHA-256, tool versions, exit code and bounded output. Do not interpret a successful signature verification as proof that the publisher is trusted; compare the certificate fingerprint with an independently verified expected fingerprint.

## Rebuild and signing workflow

1. Preserve the source APK and its original hash.
2. Obtain explicit, task-scoped approval before decompiling, rebuilding, aligning, signing or launching MT Manager.
3. Decompile into a new workspace directory. Do not overwrite existing output.
4. Review the diff and manifest changes. Validate permissions, package ID, version metadata and embedded resources.
5. Rebuild to a new unsigned APK path.
6. Run alignment checks; if alignment is required, write a distinct aligned APK.
7. Verify the unsigned/aligned artifact hash and record the intended signing identity.
8. Sign only when the approval and separate execution authorization both match the task, operation and exact input artifact hash. High-risk signing requires a reviewer distinct from the executor.
9. Supply passwords to apksigner only through a secret-manager-injected environment using SG_ANDROID_KEYSTORE_PASSWORD and SG_ANDROID_KEY_PASSWORD. The invocation contains environment-variable references only, never secret values.
10. Verify the resulting signature and alignment, compare the certificate SHA-256 fingerprint with the approved release certificate, and record output hashes.
11. Installation, publication, Play Console upload, distribution, update of an existing app, and signing-key rotation are separate actions requiring separate approval.

## Key custody

- Never place a keystore, private key, password, recovery phrase or certificate private material in Git, chat, issue descriptions, task records, test fixtures, logs or build artifacts.
- Never print password environment values or include them in process arguments.
- Keep release keys in a dedicated secure vault or offline controlled store. Use a distinct test key for non-production tests.
- Restrict key access to named release operators; log access metadata, not secret contents.
- Do not generate, replace, export, rotate or delete a production signing key as part of ordinary APK modification.
- If a signing key is suspected compromised, stop release work and invoke the organisation's incident and key-rotation procedure.

## GEN SYSTEM integration

The Android Termux adapter is registered under android-termux in live-framework/AGENTIC-MULTI-IDE-CLI/src/android-adapter.mjs. It advertises fixed operations and declares supportsShell: false. The Android policy module returns argument-array invocations with shell: false; it does not execute them. Approval and execution-authorization records must be resolved by trusted server-side services and injected by the runner; never accept approval claims directly from an untrusted client payload. A future device runner must enforce canonical-path containment, restricted OS identity, command timeout/output limits, secret-manager injection, authenticated approval resolution, separate execution authorization and durable redacted audit events.

## Verification checklist

- [ ] Device connection and identity verified on the actual Android target.
- [ ] MT Manager package ID discovered from the device; no guessed package name.
- [ ] Required tools and versions probed; missing tools recorded.
- [ ] Input APK SHA-256 captured and original preserved.
- [ ] Manifest, package metadata, DEX, alignment and signature inspected.
- [ ] Any write operation has exact target, task-scoped approval and separate execution authorization.
- [ ] Signing key remains in approved secure storage; secrets never enter arguments or logs.
- [ ] Signed output signature, certificate fingerprint, alignment and hash verified.
- [ ] Install/distribution/deployment separately approved.
- [ ] Evidence and outcome recorded in the GEN SYSTEM audit service.

## Common mistakes

- Assuming MT Manager is installed or hard-coding its package identifier.
- Treating APK signature verification as publisher trust verification.
- Reusing a production keystore for local tests.
- Overwriting the original APK or signing an artifact whose hash differs from the approved one.
- Passing passwords on a command line or logging environment values.
- Treating source code committed to GitHub as proof that an Android device is connected or that an APK was signed.
