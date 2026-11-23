# SG-CODEX X1000 Studio Orchestrator and CLI

GEN SYSTEM bounded orchestration baseline for ten initial engineering studios and measured scaling toward 1,000 logical workers. The package includes a local `sg-codex` CLI and the first Object Engine vertical slice.

## Requirements
- Node.js 20 or later
- npm

## Build and test
```sh
npm install
npm run build
npm test
```

## CLI
Run after building:
```sh
npm run start -- help
npm run start -- init
npm run start -- doctor --json
npm run start -- object types
npm run start -- object create Text '{"value":"hello"}' --id hello-1
npm run start -- object get hello-1
npm run start -- object list Text
npm run start -- object delete hello-1 --yes
```
The compiled executable is `dist/cli.js` and the package exposes the `sg-codex` bin command.

## Object Engine
The registry contains 30 micro-types: Text, Number, Boolean, Date, List, Map, File, Link, Tag, Comment, User, Team, Role, Task, Project, Order, Product, Invoice, Event, Place, Image, Audio, Video, Model, Note, Page, Block, Form, Chart and Dashboard.

Objects are stored in `.sg-codex/objects.json relative to the selected project directory. Object data must be JSON-compatible and is limited to 1 MiB per object. IDs are restricted to 1-128 letters, numbers, underscores or hyphens. Writes are serialized within one process and persisted using temporary-file replacement.

## Safety model
- Existing studio scheduler remains read-only by default.
- Object storage is local to the project; no network sync is performed.
- CLI does not execute shell commands, spawn agents, install plugins or deploy.
- `object delete` requires explicit `--yes`.
- Symlinked store directories/files and corrupt JSON are rejected; corrupt files are preserved.
- Shared writes remain disabled in the orchestrator; integration requires review and approval.

## Initial studios
Architecture, Android, Windows, DeepSeek Harness, Codex Bridge, Governance, Security, Testing, Build and Documentation.
