# SG-CODEX X1000 Studio Orchestrator

A small, dependency-free Node.js orchestration core for defining independent engineering studios, validating task dependencies, planning bounded concurrency, and enforcing review/approval gates.

## Safety defaults

- Read-only task mode by default.
- No worker processes are launched by this package.
- No shell, filesystem, network, GitHub, deployment, or model-provider integrations are enabled.
- Task workspaces are logical identifiers only; this package does not create directories.
- Patch proposals require review; consequential execution requires a separate approval decision.
- The 1,000-worker setting is a logical planning ceiling, not a claim of 1,000 live agents.

## Requirements

- Node.js 22 or newer.

## Run

```sh
npm test
npm start
```

## Initial studios

The registry defines ten workstreams: architecture, Android, Windows, DeepSeek Harness, Codex bridge, governance, security, testing, build, and documentation.

## Integration boundary

A future worker adapter must be implemented separately. It must provide authenticated worker identity, isolated workspaces, resource quotas, cancellation, event evidence, and explicit execution approval. Do not connect a worker backend until those controls have been independently reviewed.
