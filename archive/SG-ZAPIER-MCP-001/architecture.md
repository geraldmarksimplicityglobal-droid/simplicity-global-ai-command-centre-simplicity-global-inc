# Architecture

## Component flow
ARCHIVE UI / CLI -> Workflow Service -> Zapier MCP Adapter -> Zapier MCP server

The workflow service accepts normalized adapter results. The adapter is injected by the host and owns protocol/session details. No Zapier URL, token, or credential is hard-coded.

## Modules
- src/types.js: workflow, run, proposal, approval and audit contracts.
- src/policy.js: immutable guardrails and transition validation.
- src/service.js: inspect, diagnose, propose, approve, authorize, execute.
- src/adapter-contract.js: runtime validation for the minimum read-only adapter surface.
- test/service.test.js: built-in Node test suite.

## Lifecycle
DISCOVERED -> INSPECTED -> PROPOSED -> REVIEW_APPROVED -> EXECUTION_AUTHORIZED -> COPY_CREATED -> COPY_TESTED

A failed check moves the proposal to BLOCKED. Approval and execution authorization are distinct events, must be performed by distinct actor IDs for high-risk changes, and are both required before an executor is called.

## Data handling
- Store secret values only in the host's secret manager.
- Do not log credentials, message bodies, or full payloads.
- Persist audit events in the host's append-only audit store in production.
- This scaffold keeps audit events in memory; durable storage is an integration requirement.

## Release gates
1. Connect a user-approved Zapier MCP server.
2. Verify available tools and read-only scopes.
3. Complete adapter contract and contract tests against a sandbox/test workspace.
4. Configure an executor with create-copy and test-only capabilities.
5. Review audit persistence, actor identity, and retention controls.
6. Obtain separate approval before enabling production writes or activation.
