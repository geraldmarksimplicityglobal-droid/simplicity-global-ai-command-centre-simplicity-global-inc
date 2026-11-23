# SG Function Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a registry for all 30 Function micro-types and a safe local dispatcher for nine deterministic operations, exposed through the SG Codex CLI.

**Architecture:** Add `function-engine.ts` as an isolated dispatcher. Keep model-backed, media, shell and mutating functions registered but unavailable. Extend the CLI with function discovery and execution commands.

**Tech Stack:** Node.js >=20, TypeScript strict mode, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-23-sg-function-engine-design.md`

## Constraints
- No network, provider, shell, file mutation or plugin calls.
- No new runtime dependencies.
- Input/output are JSON-safe.
- Deferred operations fail closed.
- Existing Object Engine and orchestrator are unchanged.

### Task 1: Function Engine

**Files:**
- Create: `sg-codex-studio/src/function-engine.ts`
- Create: `sg-codex-studio/src/function-engine.test.ts`

- [x] Test the exact 30-function registry and capability states.
- [x] Test all nine local operations and invalid input cases.
- [x] Test that all deferred and approval-gated operations fail closed.
- [x] Implement typed registry, error type, and dispatcher.
- [x] Run build and tests.

### Task 2: CLI integration

**Files:**
- Modify: `sg-codex-studio/src/cli.ts`
- Modify: `sg-codex-studio/src/cli.test.ts`

- [x] Test `function types` and JSON output.
- [x] Test `function run <name> <json>`, malformed input, unknown function and deferred operation behavior.
- [x] Implement CLI routing without adding shell or network execution.
- [x] Run full build and test suite.

### Task 3: Documentation and verification

**Files:**
- Modify: `sg-codex-studio/README.md`

- [x] Document registry, available operations, deferred capabilities and examples.
- [x] Run GitHub Actions build/test workflow on the feature branch.
- [x] Review diff and preserve the feature branch; do not merge or deploy.
