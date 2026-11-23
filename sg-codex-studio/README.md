# SG-CODEX X1000 Studio Orchestrator + CLI

GEN SYSTEM bounded orchestration baseline and safe local CLI starter.

## Safety model

- Read-only task mode by default.
- Each studio receives a distinct workspace path.
- Shared writes are disabled by policy.
- Integration requires review and explicit approval.
- The object engine is in-memory in this starter; no database is configured.
- Delete operations require an explicit `allowDelete: true` approval flag.
- The CLI does not execute arbitrary shell commands, access credentials, connect external services or deploy.

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
npm run cli -- objects list
npm run cli -- objects validate Task '{"title":"Example"}'
```

## Object Engine

The starter registers 30 micro-types: Text, Number, Boolean, Date, List, Map, File, Link, Tag, Comment, User, Team, Role, Task, Project, Order, Product, Invoice, Event, Place, Image, Audio, Video, Model, Note, Page, Block, Form, Chart and Dashboard.

The engine provides typed records, validation, create/read/list/update/delete operations, version numbers and an in-memory audit log. Persistent storage, authentication, RBAC, API/MCP adapters and external plugin execution are subsequent integration phases.

## Existing orchestration

The existing scheduler remains intact: ten initial studios, isolated workspaces, bounded concurrency and approval before integration. This package defines a scheduler core; it does not launch agents or execute commands.
