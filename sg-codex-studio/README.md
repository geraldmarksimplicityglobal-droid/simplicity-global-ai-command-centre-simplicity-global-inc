# SG-CODEX X1000 Studio Orchestrator + CLI

GEN SYSTEM bounded orchestration baseline and safe local Codex CLI starter.

## Safety model

- Read-only task mode by default.
- Each studio receives a distinct workspace path.
- Shared writes are disabled by policy.
- Integration requires review and explicit approval.
- Object records are persisted locally in a JSON file; no database or external service is configured.
- Delete operations require the explicit `--approve-delete` flag.
- The CLI does not execute arbitrary shell commands, access credentials, connect external services or deploy.
- The local JSON store is single-process development storage, not a concurrent production database.

## Requirements

- Node.js 20 or newer
- npm
- Dependencies installed from this package manifest

## Build and test

```sh
npm install
npm run build
npm test
npm run cli -- help
npm run cli -- objects types
npm run cli -- objects create Task '{"title":"Example"}'
npm run cli -- objects list Task
npm run cli -- objects audit
```

Set `SG_CODEX_STORE` or pass `--store <path>` to select a different local JSON store. The default is `.sg-codex/objects.json` relative to the current working directory.

## Object Engine

The starter registers 30 micro-types: Text, Number, Boolean, Date, List, Map, File, Link, Tag, Comment, User, Team, Role, Task, Project, Order, Product, Invoice, Event, Place, Image, Audio, Video, Model, Note, Page, Block, Form, Chart and Dashboard.

The engine provides typed records, validation, create/read/list/update/delete operations, version numbers and audit events. The file adapter persists records and audit events across CLI invocations, uses atomic file replacement and restrictive file permissions, and refuses to read or replace a symbolic-link store file.

## CLI commands

- `objects types` — list registered types.
- `objects validate` — validate a JSON payload without storing it.
- `objects create`, `get`, `list`, `update` — persist and inspect records.
- `objects delete` — requires `--approve-delete`.
- `objects audit` — inspect the local audit history.

## Existing orchestration

The existing scheduler remains intact: ten initial studios, isolated workspaces, bounded concurrency and approval before integration. This package defines a scheduler core; it does not launch agents or execute commands.

## Next integration stages

1. Add a transactional database adapter and schema migrations.
2. Add authenticated API and MCP interfaces with role-based access control.
3. Add plugin adapters behind allowlisted capabilities and explicit approval gates.
4. Connect agent execution only after sandbox, resource limits and audit controls are verified.
