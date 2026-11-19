# Simplicity Global Build & Release Skill

## Purpose
Apply one repeatable, evidence-led build, test, integration, and release procedure to every Simplicity Global application. Follow the project's existing conventions rather than imposing a new stack or inventing build commands.

## Operating rules
1. Inspect before editing. Record repository, branch, commit, working tree state where available, project type, package manager, runtime, existing CI, deployment target, and current release state.
2. Preserve source history. Do not replace repositories, rewrite history, force-push, delete files, or merge branches as part of routine setup.
3. Separate facts from assumptions. Label each finding VERIFIED, PROPOSED, BLOCKED, or NOT TESTED, with evidence such as a commit, workflow run, build log, or deployment URL.
4. Never expose credentials. Use provider secret stores and least-privilege credentials. Do not print, commit, or copy tokens, API keys, passwords, private keys, or connection strings.
5. Treat external changes as gated. A code change on a dedicated branch is permitted only within the requested scope. OAuth linking, permission changes, domain/DNS changes, production deployment, data migration, billing changes, and account/security changes require separate explicit approval.
6. Do not claim a release is live until the provider reports success and the deployed URL is independently checked.

## Standard workflow

### Phase A — Discover and baseline
- Identify the canonical Git repository and default branch.
- List branches, latest commits, project files, lockfiles, CI workflows, environment-variable names (never values), and deployment configuration.
- Identify each app independently: Orchestrator, Studio, Wallet & Telemetry, and any additional discovered project.
- Capture a baseline report before modifying anything.
- If source is duplicated across Lovable, Replit, and GitHub, compare commit IDs and file trees; do not assume they are synchronized.

### Phase B — Derive the build procedure
- Read the actual package manifest, lockfile, runtime/toolchain declarations, README, and CI workflow.
- Use the repository's package manager and pinned runtime versions.
- Reproduce existing CI steps first. For the verified orchestrator workflow this means syntax validation and unit tests. For the verified Python scheduler workflow this means compile checks, unit tests, scheduler-plan generation, and evidence artifact upload, including the Python versions declared by its matrix.
- These historical workflows were successful in the inspected runs, but that is not proof that a new commit or another app passes.
- Never invent a build, lint, or test command. If no build script exists, report that fact and propose the smallest justified addition.

### Phase C — Implement on an isolated branch
- Create a clearly named working branch from the inspected source branch.
- Make minimal, reviewable changes. Keep unrelated projects and files untouched.
- Add or update automated checks only after confirming the project's real commands and supported runtime.
- Review the diff for secrets, generated artifacts, license/compliance issues, and unintended changes.
- Record commit SHA and changed-file list.

### Phase D — Validate
- Run dependency installation using the existing lockfile in frozen/CI mode where supported.
- Run syntax/type checks, unit tests, integration tests, and production build only when the project defines them.
- Preserve logs and test artifacts without secrets.
- A failed or skipped check blocks promotion. A historical green run is not a substitute for a current run.

### Phase E — Connect platforms
- GitHub is the canonical source unless the project owner explicitly selects another source of truth.
- Connect Lovable and Replit to the same approved repository/branch using their supported GitHub connection flows. Verify the connected repository, branch, and latest commit after linking.
- Do not overwrite a platform project with a different repository or import a duplicate without an explicit migration plan.
- Connect Vercel to the approved repository and configure the correct root directory, framework preset, build command, output directory, and environment-variable names only after inspection.
- If provider permissions or account access block linking, record the exact blocker; do not work around it with personal tokens or alternate accounts.

### Phase F — Preview release
- Require current validation to pass before preview deployment.
- Deploy preview only, using provider-supported mechanisms and existing project settings.
- Verify deployment status, commit association, build logs, route availability, and basic smoke tests.
- Check application-to-API-to-data flows where applicable, using test/sandbox data.
- Record preview URL and evidence. Do not publish production automatically.

### Phase G — Production release
- Production requires a separate explicit approval after preview evidence is reviewed.
- Confirm release commit, rollback target, environment, secrets availability, database migration plan, monitoring, and business continuity readiness.
- Deploy using the provider's approved release process.
- Verify provider success and live application behavior. Record timestamp, commit, URL, and rollback procedure.
- If verification fails, stop promotion and follow the documented rollback/recovery procedure.

## Platform-specific acceptance checks

### GitHub Actions
- Confirm workflow trigger, branch filters, runtime matrix, install strategy, test commands, artifact handling, permissions, and secrets usage.
- Inspect jobs and individual steps. Rerun failed jobs only when there are failed/cancelled jobs and the integration has Actions write permission.
- For a fresh full run, use an authorized workflow dispatch or repository UI. Do not describe a historical run or a partial retry as a new full run.

### Lovable
- Verify project ID, current commit, project build status, preview URL, and whether the GitHub repository/branch is connected.
- Agent completion and project provisioning status are different states; inspect both.
- Do not publish unless separately approved.

### Replit
- Verify the exact app/repl ID, source repository, branch, build/run configuration, and deployment status.
- A static demo or sample-data app is not production-ready merely because it opens.
- Publish only after current build/test and preview checks pass and release approval is given.

### Vercel
- Verify the correct team/account, project, linked Git repository, root directory, framework, build settings, environment configuration, and deployment protection.
- A 403 or missing project is a permission/configuration blocker, not evidence that deployment succeeded.
- Verify preview first; production promotion remains separately gated.

## Required output for every project
Produce a concise project record containing:
- Project name and canonical repository
- Source branch and inspected commit SHA
- Runtime, package manager, and actual scripts/commands
- Existing workflow and latest run evidence
- Current build/test results (PASS / FAIL / NOT RUN)
- Platform connection state (VERIFIED / PENDING / BLOCKED)
- Preview deployment state and URL, if any
- Production state (NOT STARTED unless separately approved)
- Risks, blockers, rollback path, and next action

## Stop conditions
Stop and report rather than guessing if source ownership is unclear, files are missing, permissions are insufficient, secrets are exposed, tests fail, data migration is required, the deployment target is ambiguous, or an operation would affect production, billing, domains, users, or persistent data without explicit approval.
