# SG-CODEX X1000 Studio Orchestrator

A small, dependency-free Node.js planning core for GEN SYSTEM's ten initial engineering studios and measured scaling toward 1,000 logical workers.

## Safety and current capability

- Planning-only. No agent backend is included or launched.
- Ten workstreams have unique workspace paths.
- Read-only is the default task mode.
- Tasks are dependency-aware and the dependency graph is checked for unknown edges and cycles.
- Concurrency is capped by requested capacity, available workers, resource budget and the hard logical limit.
- Approval records must match the action ID and exact scope.
- No file writes, shell execution, package installation, external network calls or deployment are performed by this package.

## Requirements

Node.js 20 or newer. No third-party packages are required.

## Commands

```sh
npm test
npm run plan
npm run plan -- --concurrency=10
```

The plan output explicitly reports `executionEnabled: false`. Connecting a real worker backend is a separate engineering phase and must implement isolated workspaces, bounded queues, cancellation, audit evidence and review-before-merge.

## Ten initial studios

1. Architecture
2. Android
3. Windows
4. DeepSeek Harness
5. Codex Bridge
6. Governance
7. Security
8. Testing
9. Build
10. Documentation

## Scaling policy

Scale only after measuring task throughput, queue wait, failure rate, review latency, memory/CPU usage and provider quotas. Logical task count is not a promise of simultaneous model sessions or available compute. The 1,000-worker value is a planning ceiling, not deployed capacity.

## Repository isolation

This package is added under its own directory on the `sg-codex-x1000-studio-bootstrap` branch. It does not replace the repository's existing root files or modify the `main` branch.
