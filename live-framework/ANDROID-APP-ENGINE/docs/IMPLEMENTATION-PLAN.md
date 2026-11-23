# Implementation and activation plan

## Stage 1 — Source module
- [x] Module scaffold, skill, manifest, policy, schema and Node.js tests.
- [x] Register module in GEN SYSTEM Architecture Library.
- [x] Keep live execution disabled and write capabilities empty.

## Stage 2 — Local read-only discovery
- [ ] Confirm Android host/device and Android version.
- [ ] Discover MT Manager version and supported inspection capabilities.
- [ ] Discover Java, Gradle wrapper, Android SDK Build Tools, zipalign, apksigner, jarsigner, keytool and ADB versions.
- [ ] Verify workspace free space and immutable artifact storage.
- [ ] No installation, root, trust prompt or device write in this stage.

## Stage 3 — Mock and adapter tests
- [ ] Add fixture APK/AAB metadata and hash verification tests.
- [ ] Add adapter contract tests with fake tool outputs.
- [ ] Validate APK signing scheme reporting and AAB upload-key verification.
- [ ] Add signer mismatch, expiry, path traversal, symlink and tamper cases.

## Stage 4 — Controlled execution
Requires separate approval for each exact target and operation:
- [ ] Authorized source or artifact modification.
- [ ] Build output generation.
- [ ] Test-key signing.
- [ ] Device installation and test.
- [ ] Production signing and publishing (separate approvals).

## Stage 5 — Production readiness
- [ ] Threat model and security review.
- [ ] Secret-vault integration and key custody runbook.
- [ ] CI provenance, SBOM, artifact attestation and audit evidence.
- [ ] Rollback rehearsal and release-owner approval.

## Activation rule
Do not change manifest.liveEnabled or add writeCapabilities until adapter implementation, security review, test evidence, and approval are complete. A green unit-test suite is not proof of live tool/device integration.
