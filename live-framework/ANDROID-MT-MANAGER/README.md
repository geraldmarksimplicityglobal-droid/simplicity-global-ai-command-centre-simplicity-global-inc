# SG-SKILL-BUILD-001 — MT Manager & Android App Signing

**Status:** Source implementation prepared; live Android activation pending.  
**Target:** Android / Termux  
**GEN SYSTEM adapter:** android-termux

This subsystem provides a governed skill for APK inspection and MT Manager handoff, plus policy-generated invocations for APK decompile/rebuild, zip alignment, signature verification and signing.

## Contents

- SKILL.md — complete agent operating skill.
- src/android-policy.mjs — fixed-operation policy and invocation builder.
- test/ — policy and skill contract tests.
- docs/ — design and implementation plan.
- manifest.json — machine-readable adapter and capability metadata.

## Test

From the repository root:

    node --test live-framework/ANDROID-MT-MANAGER/test/*.test.mjs live-framework/AGENTIC-MULTI-IDE-CLI/test/android-adapter.test.mjs

## Runtime boundary

The module prepares commands but does not execute them. A connected Android runner must independently canonicalize paths, enforce sandboxing and resource limits, resolve approvals from authenticated server-side services, inject secrets from a vault, and persist redacted audit events. MT Manager is user-operated; no private API is assumed.

No Android device was connected during this source build. No app, driver, package, permission, keystore or device setting was changed.