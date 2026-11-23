# Android release checklist

## Authorization and provenance
- [ ] App owner and written authorization recorded.
- [ ] Package ID, version, artifact type and original SHA-256 recorded.
- [ ] Original artifact preserved; output path is distinct.
- [ ] Exact change scope and reviewer approved.

## Build and signing
- [ ] Gradle/SDK Build Tools versions pinned and recorded.
- [ ] APK aligned before signing, where applicable.
- [ ] APK signature verified with apksigner.
- [ ] AAB signature verified with the configured upload-key workflow.
- [ ] Signer certificate fingerprint matches approved identity.
- [ ] Key material stored outside source control and logs.

## Testing and release
- [ ] Install/update tested on approved emulator/device.
- [ ] Permissions, startup, critical flows and crash/ANR signals reviewed.
- [ ] Privacy and dependency/SBOM review completed.
- [ ] Release notes, evidence bundle and rollback artifact prepared.
- [ ] Production signing approval recorded separately.
- [ ] Play Console publishing approval recorded separately.
- [ ] Post-release version/track and monitoring evidence captured.

**Release state:** blocked until every applicable item is evidenced and approved.
