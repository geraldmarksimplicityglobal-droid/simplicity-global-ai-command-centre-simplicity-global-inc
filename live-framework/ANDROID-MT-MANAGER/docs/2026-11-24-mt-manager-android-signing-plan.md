# SG-SKILL-BUILD-001 — Implementation Plan

## Task 1 — Define policy tests first
- Add tests for adapter registration, read-only command construction, unknown operation denial, workspace containment, scoped approval, signing reviewer separation, secret references and MT Manager package discovery.
- Run tests before implementation and capture expected missing-module failures.

## Task 2 — Implement the Android operation policy
- Add fixed tool and operation allowlists.
- Validate absolute Android paths against approved workspace roots.
- Construct argument arrays only; never invoke a shell.
- Require resource-bound approval plus separate execution authorization for mutation and app launch.
- Use environment-variable references for signing passwords.

## Task 3 — Integrate the Agentic adapter
- Add android-termux to the existing GEN SYSTEM adapter registry.
- Reuse the Android subsystem's single adapter manifest to avoid drift.
- Declare read-only-by-default and supportsShell false.

## Task 4 — Author the reusable skill and operating docs
- Document preflight, MT Manager manual handoff, APK inspection, rebuild/signing, key custody and release verification.
- Explicitly distinguish source implementation from live device activation.

## Task 5 — Verify
- Run the complete Node built-in test suite for Android policy and Agentic adapter.
- Run syntax checks and inspect the final diff.
- Record device activation as pending if the host is offline.

## Task 6 — Integrate into GitHub
- Add files to the existing codex/live-enterprise-framework branch only.
- Update the Agentic framework README and integration roadmap with the Android adapter entry.
- Read back committed files and verify the branch contents.
- Do not merge to main, install Android packages, run device commands, or sign/install an APK without separate authorization.