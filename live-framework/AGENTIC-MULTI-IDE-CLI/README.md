# GEN SYSTEM — Agentic Multi-IDE / CLI Workflow

**System ID:** `SG-AGENTIC-MULTI-IDE-CLI-001`  
**Status:** Source scaffold committed; local runtime activation unverified  
**Integration target:** `codex/live-enterprise-framework`

## Purpose

Provide a governed orchestration layer for development tasks across IDEs, CLI agents, repositories and local devices. The orchestrator coordinates work; it does not grant an agent unrestricted access to a workstation, repository, cloud account or production environment.

## Architecture

1. **Command centre** — accepts a task and records its requester, scope, repository, risk and desired outcome.
2. **Agent orchestrator** — decomposes work into task contracts and assigns eligible adapters.
3. **Policy gate** — enforces least privilege, approval separation and explicit execution authorization.
4. **IDE adapters** — VS Code, Cursor, Windsurf, JetBrains and browser IDE integrations. An IDE adapter may report capabilities and exchange task context; it is not presumed connected until a handshake is verified.
5. **CLI adapters** — Codex CLI, GitHub CLI, Claude Code, Gemini CLI, Aider, Python and Termux. Each adapter must declare its executable, version probe, supported capabilities and permission tier.
6. **Repository/workspace layer** — operates on an explicitly selected repository and branch. Preserve uncommitted work; never silently switch branches or overwrite files.
7. **Evidence layer** — records task events, command proposals, test results, commit references and rollback instructions.

## Agent roles

| Agent ID | Role | Default authority |
|---|---|---|
| AGENT-A | Orchestrator | Plan and delegate; no shell execution |
| AGENT-B | Architect | Read and propose designs |
| AGENT-C | Researcher | Research and cite sources |
| AGENT-D | Developer | Generate patches in an isolated worktree |
| AGENT-E | Security reviewer | Read-only review and findings |
| AGENT-F | Test engineer | Run approved tests in a sandbox |
| AGENT-G | DevOps engineer | Prepare infrastructure changes; no provisioning |
| AGENT-H | Data/API engineer | Prepare schema and API changes |
| AGENT-I | Release manager | Prepare release evidence; no production release |

Roles are policy labels, not separate authenticated AI identities. Real agent identity and provider capabilities must be verified by each adapter.

## Task lifecycle

`submitted → inspected → planned → awaiting_approval → approved → execution_authorized → executing → validating → completed`

Terminal alternatives: `rejected`, `failed`, `cancelled`.

Approval is not execution authorization. A reviewer approves the proposed change; a separate authorized action grants execution for a narrowly defined command/resource scope. High-risk tasks require reviewer/executor separation. No workflow transition itself deploys software, provisions infrastructure, spends money, sends messages or changes external accounts.

## Security invariants

- Deny by default; least privilege per adapter and per task.
- Read-only discovery is the initial integration mode.
- Never pass arbitrary user text to a shell.
- CLI adapters must use argument arrays, fixed executable allowlists, bounded timeouts and explicit working directories.
- No secret values in task payloads, prompts, logs, artifacts or Git.
- Do not expose a local bridge to the public internet. Bind to loopback or use an authenticated private tunnel.
- Require explicit per-operation approval for file writes, package installation, external API writes, cloud changes and deployment.
- Keep production credentials unavailable to development agents.
- Use isolated worktrees/branches and review diffs before accepting changes.
- Persist audit events to the approved backend before claiming durable auditability.

## Current implementation in this directory

- `src/workflow.mjs`: deterministic task state machine with reviewer separation for high-risk work.
- `test/workflow.test.mjs`: Node built-in tests for lifecycle and approval invariants.
- `src/runtime-policy.mjs`: non-executing policy gate for adapter allowlists, workspace containment, bounded arguments/timeouts/output, environment-variable filtering and expiring task-scoped approvals.
- `test/runtime-policy.test.mjs`: Node built-in tests for runtime policy and approval boundaries.
- `src/windows-runtime-bridge.mjs`: loopback-only HTTP bridge with bearer authentication, server-side approval resolution, separate execution authorization, workspace realpath containment, bounded request bodies, and process invocation using argument arrays with `shell: false`.
- `test/windows-runtime-bridge.test.mjs`: Node built-in contract tests for loopback binding, authentication, untrusted client approvals and denied execution.

The Windows bridge requires injected trusted approval, execution-authorization and durable audit services and refuses to start without them. It binds only to loopback by default. Its process launcher is not an OS sandbox; before any live activation, run it under a restricted OS identity with filesystem ACLs, process limits and network egress controls.

The runtime policy module validates a proposed invocation; it does not launch processes. A future runner must use argument arrays with `shell: false`, OS-level sandboxing, cancellation, bounded output capture and a separately authenticated execution authorization service.

This is a source-level foundation only. It is not connected to an identity provider, database, IDE, CLI process, local device or production environment. The workflow event store in this module is in-memory and must be replaced by the existing authenticated API/database audit service before multi-user or production use.

## Activation sequence

1. Inspect the authorized Windows host and Android/Termux host; record OS and runtime versions.
2. Verify Node.js and Git versions and inspect existing working-tree changes.
3. Install/configure only approved IDE/CLI adapters; do not overwrite user configuration.
4. Connect adapters in read-only capability-discovery mode.
5. Run unit and adapter contract tests in an isolated workspace.
6. Connect workflow persistence to the enterprise API and append-only audit service.
7. Test tenant isolation, approval separation, secret redaction and rollback.
8. Obtain separate approval for each staging deployment, production deployment and spend.

## Device topology

- Windows development host: primary local runner, subject to an authenticated Desktop Commander/local bridge connection.
- Android/Termux: secondary constrained runner; never treat a phone shell as a privileged server.
- Web/cloud IDEs: remote workspaces with repository-scoped credentials.
- GitHub: source-of-truth for reviewed changes and CI evidence.

**Runtime truth:** a repository commit proves source was stored. It does not prove that an IDE, CLI, host, agent or deployment is online.
