# SG Function Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

- [ ] Test the exact 30-function registry and capability states.
- [ ] Test all nine local operations and invalid input cases.
- [ ] Test that all deferred and approval-gated operations fail closed.
- [ ] Implement typed registry, error type, and dispatcher.
- [ ] Run build and tests.

### Task 2: CLI integration

**Files:**
- Modify: `sg-codex-studio/src/cli.ts`
- Modify: `sg-codex-studio/src/cli.test.ts`

- [ ] Test `function types` and JSON output.
- [ ] Test `function run <name> <json>`, malformed input, unknown function and deferred operation behavior.
- [ ] Implement CLI routing without adding shell or network execution.
- [ ] Run full build and test suite.

### Task 3: Documentation and verification

**Files:**
- Modify: `sg-codex-studio/README.md`

- [ ] Document registry, available operations, deferred capabilities and examples.
- [ ] Run GitHub Actions build/test workflow on the feature branch.
- [ ] Review diff and preserve the feature branch; do not merge or deploy.
