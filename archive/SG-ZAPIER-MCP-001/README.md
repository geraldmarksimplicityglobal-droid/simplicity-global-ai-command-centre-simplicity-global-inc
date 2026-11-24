# SG-ZAPIER-MCP-001 — ARCHIVE Zapier MCP Bridge

**Status:** implementation scaffold; live connection and acceptance tests pending user-side OAuth setup.

## Purpose

Connect ARCHIVE (Windows 11 / Visual Studio Code) to Zapier's hosted Model Context Protocol (MCP) server. This project is a client-side integration scaffold; it does not reimplement or self-host Zapier MCP.

- Remote endpoint: `https://mcp.zapier.com/api/v1/connect`
- Transport: Streamable HTTP
- Authentication: interactive Zapier OAuth from the MCP-compatible client
- No credentials or bearer tokens are stored in this repository.

## Implemented scope

- Read-only workflow inventory/inspection adapter contract.
- Normalization of workflow and run-history data supplied by an authorized adapter.
- Failure diagnosis and copy-only repair proposals.
- Separate reviewer approval and execution authorization.
- SHA-256 proposal digest binding to invalidate stale approvals after any plan change.
- Copy-only executor seam; no overwrite, delete, or production activation operation.
- Unit tests using Node.js built-ins and mocked adapters.
- VS Code remote MCP configuration example and GitHub Actions test workflow.

## Important capability boundary

Zapier MCP exposes the tools configured for a particular server and connected apps. It does **not** guarantee a universal Zap inventory, Zap editor, run-history API, or workflow-cloning operation. The methods `listWorkflows`, `getWorkflow`, and `getRunHistory` below are ARCHIVE-side adapter contracts, not claims about built-in Zapier MCP tools. Implement them only if actual authenticated read tools or a separately authorized export/API source can supply the data. Missing capabilities must be reported as unsupported.

## Local setup (Windows 11 / VS Code)

1. Install Node.js 20 or later.
2. Copy `.vscode/mcp.json.example` to `.vscode/mcp.json` (or merge its server entry into the existing file).
3. Open the workspace in VS Code and complete the interactive Zapier sign-in flow.
4. In the Zapier MCP server settings, enable only the tools required for the task; start with read-only tools.
5. Run tests from this directory:

```powershell
npm test
```

The configuration only registers the remote endpoint. It does not complete OAuth or grant app permissions.

## Safety lifecycle

`DISCOVER → INSPECT → DIAGNOSE → PROPOSE → REVIEW APPROVAL → EXECUTION AUTHORIZATION → CREATE COPY → TEST COPY → AUDIT`

- Inspection is read-only.
- Approval is bound to the exact proposal digest.
- Execution authorization is a separate step and is also bound to that digest.
- Any post-approval change invalidates the approval chain.
- Live writes are disabled by default.
- Existing workflows are never overwritten or deleted.
- Production activation is outside this release.
- Tests use mocked adapters only; no external messages, CRM writes, financial actions, or production triggers.

## Release gates

- [x] ARCHIVE naming recorded in repository README.
- [x] Zapier endpoint and transport documented.
- [x] Approval and execution authorization separated and digest-bound.
- [x] Copy-only execution interface and default-deny policy.
- [x] Automated unit-test workflow added.
- [ ] User completes Zapier OAuth in VS Code.
- [ ] Actual tool inventory is reviewed and mapped to adapter capabilities.
- [ ] Read-only live smoke test passes in a non-production workspace.
- [ ] Copy-only executor is implemented and tested in a sandbox.
- [ ] Durable append-only audit storage is integrated.
- [ ] Separate authorization is obtained before any production write or activation.
