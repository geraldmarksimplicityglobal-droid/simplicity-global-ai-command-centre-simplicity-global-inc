# SG-ZAPIER-MCP-001 — ARCHIVE workflow bridge

Status: foundation scaffold / local tests. Execution mode: inspect-first; live writes disabled by default.

This module defines a guarded integration boundary for Zapier MCP. It contains no credentials, does not connect to a Zapier account, and cannot modify live Zaps by default. A host application must inject an approved MCP adapter after configuring credentials and permissions.

## Capabilities
- Inventory and inspect workflows through a read-only MCP adapter.
- Normalize inspection results and diagnose run errors without changing the source workflow.
- Produce change proposals and replacement plans.
- Separate reviewer approval from execution authorization.
- Require explicit execution authorization before any write.
- Keep the default executor disabled; no live operation runs until a host-provided executor is deliberately enabled.
- Emit structured audit events for state transitions.

## Quick start
Run npm test from this directory (Node.js 20+).

## Integration contract
Implement ZapierMcpAdapter with listWorkflows, getWorkflow, and getRunHistory. For live actions, a separately configured WorkflowExecutor must implement createWorkflowCopy and testWorkflowCopy. This release has no overwrite or delete operation.

## Safety boundary
Approval is not execution authorization. Existing workflows are immutable from this module. New workflows are created as copies only. Production activation is out of scope and requires a later release gate.
