# SG Android App Engine

**ID:** SG-SKILL-BUILD-001 · **Target:** Android · **Scope:** complete-plus · **Status:** implemented-source / plan-only

A governed subsystem for MT Manager-assisted inspection, authorized APK/AAB and source-project engineering, signing and verification plans, device-test planning, and release governance.

## Contents
- [Skill instructions](./SKILL.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Implementation and activation plan](./docs/IMPLEMENTATION-PLAN.md)
- [Release checklist](./templates/release-checklist.md)
- [Manifest](./manifest.json)
- [Toolchain policy](./config/toolchain-policy.json)
- [Android job schema](./schemas/android-job.schema.json)

## Commands
```bash
npm test
npm run check
```

## Current boundary
This source module builds reviewable plans only. No shell, MT Manager, Android SDK, ADB, signing key, device, emulator or Play Console integration is activated. No APK/AAB has been modified, signed, installed or published.
