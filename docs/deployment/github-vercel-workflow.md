# ARCHIVE — GitHub Actions and Vercel delivery workflow

**Workflow ID:** `SG-DELIVERY-GITHUB-VERCEL-001`  
**Repository:** `simplicity-global-ai-command-centre-simplicity-global-inc`  
**Branch for this increment:** `codex/archive-zapier-mcp-001-clean`  
**Mode:** audit / preview-first; production release remains approval-gated.

## Delivery path

1. A pull request targeting `main` runs the ARCHIVE CI workflow.
2. CI executes the existing `SG-ZAPIER-MCP-001` Node.js test suite with Node 20.
3. The Vercel Git integration is the intended preview-deployment mechanism. It should build a preview for the reviewed commit; CI does not deploy a second copy with the Vercel CLI.
4. A reviewer checks the GitHub test result and the Vercel preview before any merge.
5. Production release remains a separate, explicitly approved operation. Do not merge or promote as part of this workflow.

## Current evidence and limitations

- The existing GitHub PR #6 is open and draft, targeting `main`.
- Its Vercel GitHub bot comment reported two Vercel projects associated with this repository and two preview deployments in `Ready` state at the time of that comment.
- The two project names are similar, with one suffixed `-39ln`. Treat this as a possible duplicate-project configuration; do not create another Vercel project or change either project until the owning Vercel team is inspected.
- The current Vercel connection does not have access to the team scope `geraldmarksimplicityglobal-6646`. Project settings, root directories, production branch, protection rules, environment variables and current deployment state therefore remain unverified.
- The repository's deployable application root and build command have not been established by this module. The existing Zapier module is a Node.js package whose test command is `npm test`; it is not assumed to be the complete web application.

## Security and release controls

- GitHub Actions receives only `contents: read`; checkout does not persist credentials.
- No Vercel token, environment variable value, OAuth token or other secret is stored in the repository.
- This workflow does not call `vercel deploy`, `vercel promote`, `vercel rollback`, or change production settings.
- Use Vercel's native Git integration for previews after confirming the canonical project and root directory.
- Before production is enabled, the Vercel owner must verify the production branch and configure an appropriate deployment approval/check. GitHub should also protect the production environment with required reviewers and branch restrictions where a CI-driven release is later introduced.
- Never put a Vercel token in workflow YAML. If a future approved CI deployment is required, store the token as a protected GitHub Environment secret, expose it only to the deploy job, pin the Vercel CLI to a reviewed version, and deploy a tested build.

## Acceptance checklist

- [ ] GitHub Actions workflow passes on the branch and PR.
- [ ] Canonical Vercel project is identified; duplicate project possibility is resolved by the account owner.
- [ ] Vercel root directory, framework, build command and output settings are verified.
- [ ] Preview URL corresponds to the exact PR commit and is manually reviewed.
- [ ] Production branch and approval protection are verified in Vercel.
- [ ] A separate explicit release approval is recorded before production deployment.

## Workflow file

`.github/workflows/archive-ci-vercel.yml`
