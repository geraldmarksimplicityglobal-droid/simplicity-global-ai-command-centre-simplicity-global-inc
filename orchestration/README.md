# SG-CODEX X1000 Studio Orchestrator

Initial isolated scheduler package for GEN SYSTEM parallel engineering.

## Status

This package defines a task queue and policy primitives. It does not deploy agents,
create remote workers, execute shell commands, modify project workspaces, or claim
1,000 concurrent workers are available.

## Requirements

- Node.js 20 or newer
- No third-party dependencies

## Verify

From this directory:

```sh
npm run verify
```

## Initial studios

ST-001 Architecture; ST-002 Android; ST-003 Windows; ST-004 DeepSeek Harness;
ST-005 Codex Bridge; ST-006 Governance; ST-007 Security; ST-008 Testing;
ST-009 Build; ST-010 Documentation.

## Safety model

- Read-only is the default task mode.
- Workspaces are isolated by studio.
- Tasks cannot pass without review and integration approval.
- Concurrency is capped by requested capacity, available workers, resource budget
  and the configured policy maximum.
- Approval is bound to an exact action ID and scope.

## Not included yet

No agent provider adapter, distributed queue, Android application source, native
runtime, credentials integration, APK build or deployment is included. These require
inspection and implementation against the actual DeepSeek Harness source repository.
