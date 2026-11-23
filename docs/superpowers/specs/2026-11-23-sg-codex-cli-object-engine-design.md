# SG Codex CLI and Object Engine — Design

## Intent
Extend the existing `sg-codex-studio` TypeScript package into a locally runnable command-line workspace for Simplicity Global engineering. The first vertical slice is the Object Engine: a typed registry and persistent local object store exposed through a CLI.

## Goals
- Preserve the existing bounded studio orchestrator and its read-only defaults.
- Provide an installable Node.js CLI named `sg-codex`.
- Register the 30 agreed object micro-types: Text, Number, Boolean, Date, List, Map, File, Link, Tag, Comment, User, Team, Role, Task, Project, Order, Product, Invoice, Event, Place, Image, Audio, Video, Model, Note, Page, Block, Form, Chart and Dashboard.
- Support validated create, get, list and delete operations with JSON persistence under the current project's `.sg-codex/` directory.
- Provide `init` and `doctor` commands and machine-readable JSON output.
- Keep operations local and deterministic; make no network calls and execute no generated code.

## Non-goals
- No agent spawning, shell-command execution, plugin installation, external API calls, cloud sync, database provisioning, deployment, billing, or production integration in this phase.
- No claim that the Codex IDE or Windows workstation is connected. This is a repository-side CLI package.

## Safety and constraints
- Node.js >=20; TypeScript strict mode; ESM; follow existing package scripts.
- Default behavior must not mutate outside the project-local `.sg-codex/` directory.
- `delete` requires an explicit `--yes` flag; otherwise display the target and refuse.
- Reject path traversal and invalid object type/data; do not read environment variable values or print credentials.
- Use atomic file replacement for JSON persistence; preserve existing records.
- Existing orchestration defaults remain READ_ONLY, isolated workspace per task, no shared writes, and review/approval before integration.

## Approaches considered
1. Extend the existing `sg-codex-studio` package (chosen): preserves its TypeScript toolchain, test conventions and orchestrator boundary.
2. Build a separate CLI package: cleaner distribution boundary but duplicates setup and complicates integration before the first vertical slice exists.
3. Add CLI commands to the Python `sg_studio` package: diverges from the existing Codex Studio TypeScript implementation.

## Architecture
- `object-engine.ts`: type registry, validation, storage contract and JSON-file implementation.
- `cli.ts`: argument parsing and command handlers; no third-party CLI framework.
- Tests use Node's built-in test runner and temporary directories.
- Package `bin` maps `sg-codex` to compiled `dist/cli.js`.

## Success criteria
- The 30 types are registered and reject unsupported types.
- Object create/get/list/delete behavior is tested, including invalid data, duplicate IDs, safe deletion and malformed persisted state.
- CLI init, doctor, help and object commands have deterministic exit codes/output.
- `npm run build` and `npm test` pass in CI on the feature branch.
- No production deployment or merge is performed.
