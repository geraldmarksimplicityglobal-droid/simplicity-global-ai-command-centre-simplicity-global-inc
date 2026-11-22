# GEN SYSTEM — Background Runner Bots & Automated Build Nodes

**System ID:** SG-RUN-001–010  
**State:** Mock runner source implemented; ephemeral GitHub-hosted CI validation workflow added. Persistent local/cloud bots are not deployed.

## Components
- `src/policy.mjs` — fixed stage allowlist and job validation.
- `src/runner.mjs` — bounded retry orchestration; invokes injected handlers only.
- `src/global-mark.mjs` — seven-gate completion validator.
- `src/index.mjs` — public exports.
- `schemas/` — job and evidence contracts.
- `test/` — offline policy and runner tests.
- `.github/workflows/background-runner-bots.yml` — ephemeral GitHub-hosted validation workflow.

## GLOBAL MARK
All seven gates must pass: build, tests, security, integration, quality, evidence and human approval. A passing build alone is not completion. Approval must be current, identify the exact job and target, and be granted by someone other than the requester.

## Boundaries
- No shell, process spawning, package installation or network access.
- Only explicitly injected stage handlers are invoked.
- CI runs isolated tests on ephemeral GitHub-hosted runners; it does not create persistent bots or deploy an application.
- External writes, DNS, OAuth administration, billing and production deployments are not permitted.
- Maximum three attempts per stage; evidence remains in memory until a durable audit service is connected.

Persistent Windows/Termux runners require a verified online host, OS-restricted identity, private authenticated channel, durable audit, resource quotas, cancellation, network egress controls, sandbox review and separate approval.
