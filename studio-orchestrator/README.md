# SG-CODEX X1000 Studio Orchestrator

A controlled, read-only task scheduler baseline for GEN SYSTEM.

## Current scope

- Ten independent studio workstreams and dependency graph.
- Isolated workspace identifiers for each studio.
- Bounded batch planning and measured concurrency calculation.
- Review decision recording.
- Cycle and policy validation.
- Status reporting that explicitly reports zero deployed agents.

## Safety boundary

This release does **not** launch agents, execute shell commands, create directories, modify application source, call model APIs, or provision workers. The 1,000 figure is a logical scaling ceiling, not current capacity. Default concurrency is ten and must be increased only after resource and review capacity are measured.

## Requirements

- Node.js 20 or newer
- npm

## Verify

```sh
npm run check
npm test
npm run build
```

## Next integration

Connect a separately reviewed worker adapter. Each adapter must enforce per-task workspace isolation, time/resource quotas, cancellation, audit evidence and human approval for writes or execution. Never pass arbitrary model-generated shell commands directly to a process runner.
