# SG-SKILL-BUILD-001 Architecture

## System position
A registered GEN SYSTEM capability under the Architecture Library. It uses strict artifact and approval policies and exports plan builders; it does not execute tools.

## Components
1. Intake/provenance: authorization, artifact classification, hashes, package/version and signer metadata.
2. MT Manager boundary: optional Android-side archive and APK inspection; discover version/capabilities before use.
3. Source build boundary: Gradle wrapper, pinned Android Gradle Plugin and SDK Build Tools.
4. APK path: authorized build/edit → zipalign → apksigner sign → apksigner verify and alignment check.
5. AAB path: bundle build → upload-key signing through configured Gradle/bundle workflow or jarsigner as appropriate → signature and bundle metadata verification. AAB is not directly installable by adb.
6. Device-test boundary: ADB/emulator inventory and explicitly approved install/test operations.
7. Release governance: evidence, privacy/permission review, approval, rollback and Play Console handoff.

## Trust boundaries
Untrusted inputs include APK/AAB archives, manifests, resources, DEX and tool output. Sensitive assets include keystores, private keys, passwords, access tokens, customer data and device identifiers. Privileged operations include artifact modification, builds, signing, device writes, installation and publishing.

## Invariants
- Default deny and read-only first.
- Preserve original bytes and hash; outputs must be distinct.
- Explicit authorization is required for the app and modification scope.
- Each protected operation requires a fresh, single-operation approval scoped to task and exact target, with expiry.
- Production key material never enters repository or logs.
- APK and AAB workflows remain distinct.
- Failure policy is stop-and-report; no silent fallback.

## Data flow
```text
Request → Authorization → Read-only Intake → Artifact Classification
        → APK | AAB | Source Project
        → Approval Gate → Modify/Build → Align (APK only) → Sign
        → Verify → Approved Device Tests → Release Review → Publish Approval
```

## Adapter contract
Future adapters must expose capability discovery, dry-run/plan output, execution result, tool version, target identity and evidence references. An adapter must not be activated merely because its executable or device is present.
