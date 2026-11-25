# Architecture

## Component flow

ARCHIVE UI / CLI → Workflow Service → Host-injected Zapier MCP Adapter → Zapier hosted MCP server

The host owns MCP session setup, OAuth, tool discovery, and protocol details. The core workflow service receives normalized data and does not store credentials.

## Modules

- `src/types.js` — lifecycle states and audit event shape.
- `src/policy.js` — default-deny controls and distinct-actor policy.
- `src/adapter-contract.js` — runtime validation and payload normalization.
- `src/service.js` — inspect, diagnose, propose, approve, authorize, copy, and test stages.
- `test/service.test.js` — built-in Node test suite.

## Adapter contract

`listWorkflows`, `getWorkflow`, and `getRunHistory` are ARCHIVE abstractions. Zapier MCP's actual tool list depends on the server configuration. The adapter must map only to tools that are actually exposed and authorized. It must reject unsupported operations rather than emulate them or silently substitute a write action.

## Lifecycle

`DISCOVERED → INSPECTED → PROPOSED → REVIEW_APPROVED → EXECUTION_AUTHORIZED → COPY_CREATED → COPY_TESTED`

Proposal content is canonicalized and hashed. Reviewer approval records that digest. Execution authorization verifies the same digest and records it separately. Dispatch verifies it again immediately before calling the executor. A changed proposal is blocked.

## Production requirements not yet implemented

- Durable append-only audit store and retention policy.
- Authenticated actor identity sourced from the host, not caller-supplied labels.
- MCP protocol/session adapter and actual tool schema discovery.
- Sandbox-backed copy executor and integration contract tests.
- Rate-limit handling, idempotency keys, retries, and operational monitoring.
