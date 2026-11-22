# Simplicity Global — Integration Roadmap

**Workstream:** GEN SYSTEM / Live Framework  
**Status:** Added to the active implementation queue  
**Governance mode:** Inspect-first; read-only until a separately scoped action is approved.

## Objective

Integrate the approved development and operations surfaces through one governed connector framework. Each connector must have a documented identity, capability boundary, permission model, approval gate, audit trail, health state, and recovery procedure.

## Integration workstreams

| ID | Integration | Scope | Initial mode | Current state |
|---|---|---|---|---|
| SG-INT-001 | Plugin Connectors | Connector catalogue, discovery, connection lifecycle, scopes, credential references, health checks, audit events and revocation | Inventory / read-only | Queued |
| SG-INT-002 | Windows Commander | Windows host inventory, secure host bridge, command preview, operator approval, execution evidence and rollback/status reporting | Read-only preflight | Queued; host connection not verified |
| SG-INT-003 | Postman | Workspace and collection inventory, API specifications, request definitions, environment references, test results and collection governance | Read-only inspection | Workspace/collection context previously inspected; no live collection execution verified |
| SG-INT-004 | GitHub | Repository and organisation context, identity, branch and PR workflow, issues, Actions/CI evidence and controlled source changes | Read-only inspection; scoped repository writes only when approved | Existing repository and feature branch are in use; PR remains subject to review and explicit merge approval |
| SG-INT-005 | Visual Studio Code (VS Code) | Workspace/repository context, extension and tool inventory, terminal boundary, task execution approvals and test evidence | Read-only workspace inspection | Queued; local VS Code session/host connection not verified |

## Shared connector contract

Every integration must implement or document:

1. **Identity:** provider, tenant/account, host/workspace, and authenticated principal.
2. **Capability manifest:** supported read and write operations, scopes, and known limitations.
3. **Credential boundary:** use provider-managed authentication or secret storage; never commit credentials or print secret values.
4. **Approval gate:** show target, exact action, expected effects, risk, and rollback before any write or execution.
5. **Execution policy:** deny by default; allow only the minimum approved operation.
6. **Audit evidence:** timestamp, actor, target, request, approval reference, result, and correlation ID; redact secrets and personal data.
7. **Health and revocation:** connection state, last verified check, expiry, disconnect/revoke path, and failure handling.
8. **Recovery:** preserve existing data and uncommitted work; record status and provide a rollback or compensating-action plan where possible.

## Implementation sequence

1. Inventory available connectors, local tools, accounts, workspaces, and host endpoints without changing them.
2. Record exact product identity and supported authentication/capabilities for Windows Commander and VS Code before selecting adapters.
3. Define a common connector manifest and approval/audit interfaces.
4. Implement mock adapters and contract tests first.
5. Add read-only provider adapters for Postman and GitHub, reusing already authorised connections where available.
6. Prepare Windows Commander and VS Code host adapters; require a verified, user-authorised host session before any local operation.
7. Run isolated contract, permission, failure, redaction, and audit tests.
8. Present a per-connector activation plan for explicit approval before connecting accounts, enabling scopes, executing commands, modifying repositories, running Postman requests, or deploying.

## Non-authorisations

This roadmap does **not** authorise account linking, OAuth consent, credential creation or rotation, local installation, extension installation, terminal commands, collection execution, repository writes, branch protection changes, organisation policy changes, production API calls, DNS changes, deployment, or spending.

Existing files, accounts, repositories, Postman collections, and local work must be preserved. Do not infer that access to one connector grants access to another.

## Completion evidence required

A workstream is complete only when its adapter contract, permission tests, approval gate, redaction tests, audit evidence, failure/revocation behaviour, and operator acceptance checks are recorded. A planned or configured connector must not be reported as connected or operational until a real authorised connection has been verified.
