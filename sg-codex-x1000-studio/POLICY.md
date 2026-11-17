# GEN SYSTEM Orchestration Policy

## Default state

All tasks begin in QUEUED + READ_ONLY. The planner may inspect task metadata and produce a plan only.

## Action gates

- READ_FILE / SEARCH_FILES: scoped read-only access.
- PREVIEW_CHANGE: produce a proposed diff; no write.
- WRITE_FILE / DELETE_FILE: deny unless a separate explicit approval names the action, workspace and expected change.
- RUN_COMMAND / INSTALL_PACKAGE / NETWORK_REQUEST / DEPLOY: disabled until separately implemented and explicitly authorized.
- Privileged device access and Shizuku shell: disabled by default.

## Workspace isolation

Each studio receives a distinct workspace identifier. Workers must not write to shared paths. Integration is a separate review-controlled operation.

## Review

Every proposed patch requires policy review, tests and explicit integration approval. Any change in target, scope, command or expected effect invalidates the approval.

## Evidence

Record task ID, state transition, reviewer decision, test result and timestamp. Do not record API keys, access tokens, private file contents or sensitive command output.

## Scaling

The logical maximum is 1,000. Effective concurrency is bounded by the smallest of requested concurrency, available workers, resource budget and the configured hard maximum. Increase in measured stages; do not infer deployment from queue size.
