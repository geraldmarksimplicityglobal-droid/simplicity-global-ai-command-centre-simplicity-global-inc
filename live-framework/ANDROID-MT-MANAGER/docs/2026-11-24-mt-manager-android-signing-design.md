# SG-SKILL-BUILD-001 — MT Manager and Android App Signing Design

**Status:** Implementation baseline approved by the instruction to proceed with architecture, implementation files, tests and GEN SYSTEM integration.  
**Target:** Android / Termux constrained runner  
**Scope:** Complete-plus  
**Execution mode:** Inspect-first; no device changes by default.

## Intent

Provide a reusable GEN SYSTEM skill and a constrained adapter for Android APK inspection, MT Manager handoff, rebuild preparation, alignment and signature verification/signing. The goal is repeatable release preparation while preserving the original APK and keeping signing keys protected.

## Goals

- Discover actual Android runtime, installed packages, MT Manager package ID and tool availability.
- Provide read-only APK metadata, manifest, DEX, badging, alignment and signature checks.
- Provide explicit, task-scoped and separately execution-authorized operations for decompile, rebuild, align, sign and app launch.
- Integrate an Android Termux adapter into the existing Agentic Multi-IDE/CLI registry.
- Keep process invocation in fixed executable allowlists and argument arrays with shell disabled.
- Test approval binding, path containment, secret handling, adapter registration and skill completeness.

## Non-goals

- Reimplement MT Manager or automate its private UI/API.
- Root the device, bypass Android permission prompts, enable debugging, install software, or change system settings.
- Generate, rotate, export, upload or delete production signing keys.
- Install or publish an APK, upload to an app store, change an existing app or update a production release.
- Claim a real Android connection or device-side result without live device evidence.

## Approaches considered

1. Native Android app: build a new APK with Kotlin/Gradle and embed APK tooling. Rejected because the request is for an MT Manager skill and governed cross-platform workflow, not a replacement Android application.
2. Unrestricted Termux shell scripts: fast to prototype but exposes arbitrary command execution and weak approval boundaries. Rejected.
3. Fixed-operation Termux adapter plus manual MT Manager handoff: selected. It reuses GEN SYSTEM Node.js adapter conventions, does not assume a private MT Manager interface, and supports explicit read/write boundaries. The adapter prepares invocations; a future authenticated Android runner executes only after server-side approval and execution authorization.

## Architecture

- SKILL.md: agent operating instructions and verification checklist.
- src/android-policy.mjs: operation allowlist, path containment, approval/resource binding, signing argument construction and adapter manifest.
- test/: policy and skill contract tests.
- AGENTIC-MULTI-IDE-CLI/src/android-adapter.mjs: adapter registration in the existing GEN SYSTEM agentic runtime.
- Android tools are configured by absolute executable paths; the module never runs a shell or stores secrets.

## Safety and trust boundaries

- Read-only inspection is the default.
- Every write/launch operation requires task-scoped approval and a distinct execution authorization, each bound to operation and exact resource.
- APK mutation approvals bind to the input APK path, SHA-256 and output path. Signing also binds the keystore path and alias; signing requires reviewer/executor separation.
- Keystore path must remain within the approved workspace; password values are supplied only by secure environment injection at execution time.
- The policy's lexical path check is not a substitute for canonical realpath/symlink checks in the actual device runner.
- The current module builds invocations; it does not execute commands. A production runner must use OS isolation, timeouts, output bounds, durable redacted audit, revocation and authenticated approvals.

## Acceptance criteria

- Unknown operations and out-of-workspace paths are denied.
- Read-only inspection does not require approval.
- Decompile/rebuild/align/sign/launch require scoped approval and execution authorization.
- Signing secrets are never embedded in arguments and signing reviewer differs from executor.
- The Android adapter is discoverable and does not expose raw shell execution.
- Live Android activation remains unverified until the registered device is connected and preflight is performed.