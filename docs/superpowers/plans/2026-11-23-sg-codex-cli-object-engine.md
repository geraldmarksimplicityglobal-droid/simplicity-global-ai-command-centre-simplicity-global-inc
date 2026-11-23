# SG Codex CLI and Object Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, locally runnable `sg-codex` CLI and a validated JSON-backed Object Engine to the existing TypeScript Codex Studio package.

**Architecture:** Keep the current orchestrator unchanged. Add a registry/validation/persistence module and a thin CLI adapter. Use Node built-ins only, store project data under `.sg-codex/`, and expose JSON output for automation.

**Tech Stack:** Node.js >=20, TypeScript strict mode, ESM, node:test, node:assert, node:fs/promises.

**Spec:** `docs/superpowers/specs/2026-11-23-sg-codex-cli-object-engine-design.md`

## Global Constraints
- Node.js >=20; TypeScript strict mode; ESM.
- No new runtime dependencies.
- All persistent writes remain inside project-local `.sg-codex/`.
- Delete requires `--yes`.
- No network calls, command execution, agent spawning or deployment.
- Existing orchestrator behavior and tests remain unchanged.

## Review Focus
- IDs containing path separators or traversal tokens must never escape the store.
- Corrupt JSON files must produce a clear error without being overwritten.
- Concurrent writes should not silently lose an update within one process.
- Unknown flags and missing arguments must fail with non-zero exit status.
- A symlinked data directory must not be followed outside the project boundary.

---

### Task 1: Object Engine contract and persistence

**Files:**
- Create: `sg-codex-studio/src/object-engine.ts`
- Create: `sg-codex-studio/src/object-engine.test.ts`

**Interfaces:**
- Export `OBJECT_TYPES` as a readonly list of the 30 names in the design spec.
- Export `ObjectType`, `StoredObject`, `ObjectStore`, `JsonObjectStore`, `validateObjectData`.
- `JsonObjectStore(rootDir: string)` methods: `create(type, data, id?)`, `get(id)`, `list(type?)`, `delete(id)`.
- Object IDs are generated with `crypto.randomUUID()`; supplied IDs must match `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`.

- [ ] Write tests for registry completeness, unsupported types, create/get/list/delete, duplicate IDs, and validation.
- [ ] Run the package test command and confirm the new tests fail because the module/API is missing.
- [ ] Implement the registry and JSON store with atomic temp-file rename; create `.sg-codex/objects.json` only on first write.
- [ ] Validate object data as JSON-compatible values and reject undefined, functions, cycles, non-finite numbers and oversized payloads (1 MiB per object).
- [ ] Run `npm run build` and `npm test`; record exact results.

### Task 2: CLI commands

**Files:**
- Create: `sg-codex-studio/src/cli.ts`
- Create: `sg-codex-studio/src/cli.test.ts`
- Modify: `sg-codex-studio/package.json`

**Interfaces:**
- CLI entry: `main(argv: string[], cwd?: string): Promise<number>`.
- Commands: `help`, `init`, `doctor`, `object types`, `object create <type> <json> [--id ID]`, `object get <id>`, `object list [type]`, `object delete <id> [--yes]`.
- JSON output is enabled by `--json`; normal output is concise human-readable text.
- Exit code 0 for success/help, 1 for operational errors, 2 for usage errors.

- [ ] Write tests for help, init, doctor, object CRUD, malformed JSON, unknown command and delete approval.
- [ ] Run tests and confirm expected failures before implementation.
- [ ] Implement argument parsing and command handlers using Node built-ins only.
- [ ] Add package `bin` entry `sg-codex: ./dist/cli.js` and a `start` script.
- [ ] Run build and complete test suite.

### Task 3: Documentation and CI verification

**Files:**
- Modify: `sg-codex-studio/README.md`
- Modify: `.github/workflows/sg-codex-studio-build.yml` only if existing workflow does not already validate this package.

- [ ] Document Node version, build/test, local linking, command syntax, data location and safety behavior.
- [ ] Inspect workflow trigger and commands; change only if necessary, preserving least-privilege permissions.
- [ ] Verify build and tests on the feature branch using the connected development environment or GitHub Actions.
- [ ] Review changed files and create a draft PR; do not merge or deploy.

## Review Focus Tests
- Add ID traversal rejection to Task 1 tests.
- Add malformed persisted JSON preservation to Task 1 tests.
- Add symlink escape rejection to Task 1 tests where supported.
- Add CLI missing-argument and unknown-flag tests to Task 2.
- Add a test confirming `delete` does not remove data without `--yes`.
