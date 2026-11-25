# SG-ZAPIER-MCP-001 — Complete Automation Catalogue

**Release track:** catalog and design baseline  
**Coverage:** enterprise-wide; 60 automation domains  
**Deployment posture:** production target, audit-first preparation  
**Execution status:** catalogue only; no Zapier workflows are activated by this document.

## 1. Operating contract

This catalogue is a design inventory, not a claim that every named app exposes a Zapier integration or that every action is available on the current Zapier plan. Each workflow must be mapped against the actual connected app, trigger/action catalog, account permissions, plan limits, rate limits, and data-processing terms before implementation.

Lifecycle:

`DISCOVER → INVENTORY → CLASSIFY → DESIGN → TEST IN SANDBOX → HUMAN REVIEW → AUTHORIZE → ACTIVATE → MONITOR → AUDIT`

Default-deny controls:
- Read-only discovery first; no source workflow is overwritten or deleted.
- New workflows are created as copies or separately named workflows where supported.
- Production activation, external communications, customer-data mutations, payments, accounting postings, payroll, banking, and credential changes require explicit scoped approval.
- Financial actions require transaction-level approval and reconciliation evidence.
- Secrets are stored only in the relevant provider's secret store or approved vault; never in Zap descriptions, source code, logs, or this repository.
- Every workflow has an owner, business purpose, data classification, least-privilege connection, error path, retry/idempotency policy, audit record, disable procedure, and rollback plan.
- If an app action or trigger is unavailable, mark it unsupported; do not silently substitute a different write operation.

## 2. Automation domains (60)

### A. Corporate administration and management
1. Corporate management — entity registers, board calendars, director changes, statutory reminders.
2. Document management — intake, classification, naming, versioning, retention, archive routing.
3. Email operations — triage, tagging, routing, draft generation, escalation.
4. Calendar operations — meeting scheduling, availability checks, agenda packs, reminders.
5. Task management — task creation, ownership, deadlines, dependency and overdue alerts.
6. Workflow approvals — request intake, reviewer routing, evidence capture, approval reminders.
7. Business intelligence — scheduled KPI collection, data refresh, management digests.
8. Compliance operations — control attestations, policy acknowledgements, renewal and filing reminders.
9. Human resources — onboarding checklists, leave requests, training and policy workflows.
10. Recruitment — candidate intake, interview scheduling, scorecard collection, status notifications.

### B. Finance and accounting
11. Accounting — source-event intake, draft journal proposals, reconciliation queues, close checklists.
12. Invoicing — invoice intake, validation, approval routing, reminders, status synchronization.
13. Accounts payable — supplier invoice capture, duplicate checks, approval routing, payment preparation.
14. Accounts receivable — receivable aging, reminder drafts, dispute routing, collections dashboards.
15. Banking connectivity — read-only statement ingestion, transaction matching, exception alerts.
16. Payment processing — payment-intent status, failed-payment alerts, refund request routing.
17. Expense management — receipt capture, policy checks, coding proposals, approval routing.
18. Payroll — timesheet collection, variance checks, payroll preparation and approval reminders.
19. Financial reporting — cash, revenue, expense, tax and management-report preparation.
20. Fraud and risk monitoring — duplicate, anomalous, threshold and beneficiary-change alerts.

**Finance safety:** no automatic payment, transfer, refund, payroll release, invoice posting, journal posting, tax filing, or bank-detail change in the initial release. Start with read-only ingestion and human-reviewed proposals.

### C. Sales, customer operations and marketing
21. CRM — lead/contact/account synchronization, deduplication, lifecycle updates.
22. Lead generation — form capture, enrichment request, source attribution.
23. Lead qualification — scoring proposals, territory routing, follow-up tasks.
24. Sales pipelines — stage-change alerts, deal hygiene, forecast preparation.
25. Customer onboarding — welcome workflow, document collection, task sequencing.
26. Customer support — ticket intake, categorization, assignment, SLA escalation.
27. Customer relationship management — renewal reminders, health signals, feedback routing.
28. Email marketing — audience synchronization, campaign drafts, consent checks.
29. Social media — content approval, publishing queues, mention monitoring.
30. Advertising — campaign reporting, spend anomaly alerts, approval requests.

### D. Websites, applications and software delivery
31. Website management — content submissions, review, publishing approvals, uptime alerts.
32. Application development — intake-to-issue workflows, release notes, product feedback.
33. GitHub — issue, pull-request, commit, release and workflow-event orchestration.
34. Vercel — preview/deployment status, build alerts, domain/certificate reminders.
35. CI/CD — build/test status aggregation, gated release requests, rollback notifications.
36. API integrations — webhook intake, schema validation, retries, dead-letter routing.
37. Databases — approved data synchronization, backup status and migration notices.
38. Software testing — test-run results, regression triage, test evidence collection.
39. Bug management — exception-to-ticket creation, severity routing, duplicate detection.
40. Application monitoring — error thresholds, incident routing, service health digests.

### E. IT, cloud and cybersecurity
41. Cloud operations — resource events, cost alerts, configuration review requests.
42. Server operations — availability checks, maintenance notices, incident escalation.
43. Windows administration — endpoint inventory, patch reminders, service-health alerts.
44. Linux administration — package and service alerts, maintenance workflow routing.
45. Cybersecurity — alert enrichment, phishing intake, vulnerability ticket creation.
46. Identity and access — joiner/mover/leaver requests, access-review reminders.
47. Backups and recovery — backup completion checks, restore-test reminders, exception escalation.
48. Helpdesk — ticket intake, routing, SLA timers, resolution surveys.
49. Network monitoring — availability and latency alerts, incident correlation.
50. Software licensing — renewal tracking, seat utilization, approval routing.

### F. AI, data and advanced automation
51. AI agents — scoped agent handoffs, task orchestration, approval checkpoints.
52. Document processing — OCR intake, extraction, validation, human exception review.
53. AI customer service — response drafts, knowledge retrieval, escalation to a person.
54. AI research — source collection, summaries, evidence review, report assembly.
55. Analytics — scheduled aggregation, anomaly detection, executive digests.
56. Data synchronization — controlled record mapping, dedupe, conflict resolution.
57. Knowledge management — capture, tagging, indexing, review and expiry reminders.
58. Business process automation — multi-app process orchestration with state tracking.
59. Notifications — event-driven alerts across approved channels and severity levels.
60. Multi-agent orchestration — delegated tasks, bounded tools, handoff records, human checkpoints.

## 3. GitHub and Vercel workflow pack

These are the first technical workflows to map and test. Trigger names and payloads must be confirmed against the connected integrations before activation.

| ID | Workflow | Trigger → action | Guard |
|---|---|---|---|
| SG-DEV-001 | Issue intake | New GitHub issue → classify and assign a triage task | No automatic closure |
| SG-DEV-002 | Pull request tracker | PR opened/updated → update project status and notify reviewers | Never auto-approve or merge |
| SG-DEV-003 | Commit digest | Commit/push → daily change digest | Read-only |
| SG-DEV-004 | CI failure handler | Failed GitHub Actions run → create/annotate incident ticket | Deduplicate by run ID |
| SG-DEV-005 | CI success notifier | Successful checks → update release readiness | No production promotion |
| SG-DEV-006 | Preview monitor | Vercel preview event → attach URL and status to PR record | Preview only |
| SG-DEV-007 | Deployment failure | Failed Vercel deployment → incident and owner alert | No automatic redeploy |
| SG-DEV-008 | Production release request | Release candidate ready → approval request | Human approval required |
| SG-DEV-009 | Security event intake | Dependabot/code-scanning event → security ticket | No auto-dismissal |
| SG-DEV-010 | Test failure triage | Test report → group failures and create work items | No code edits without review |
| SG-DEV-011 | Release notes | Approved release metadata → draft release notes | Draft only |
| SG-DEV-012 | Documentation sync | Merged documentation change → notify knowledge owner | No overwrite of source |
| SG-DEV-013 | Backup verification | Scheduled backup report → record evidence and alert exceptions | No destructive restore |
| SG-DEV-014 | Project status digest | Repository and deployment status → weekly report | Read-only |
| SG-DEV-015 | Incident escalation | Repeated failures or critical alert → escalation chain | Severity policy and on-call validation |

## 4. Enterprise workflow registry schema

Every designed workflow must have these fields:

- `automation_id`, `name`, `domain`, `business_owner`, `technical_owner`
- `purpose`, `trigger_provider`, `trigger_event`, `action_providers`, `action_summary`
- `data_classification`, `data_subjects`, `retention_policy`, `connection_identity`, `permissions`
- `environment` (sandbox/staging/production), `status`, `version`, `source_workflow_id`
- `idempotency_key`, `retry_policy`, `rate_limit_policy`, `timeout_policy`, `failure_route`
- `approval_policy`, `approval_record`, `activation_authorization`
- `audit_location`, `last_tested_at`, `last_success_at`, `last_failure_at`
- `disable_method`, `rollback_method`, `recovery_owner`, `review_due_at`

Allowed statuses: `DESIGNED`, `BLOCKED_ON_CONNECTION`, `READY_FOR_SANDBOX`, `SANDBOX_TESTING`, `AWAITING_REVIEW`, `APPROVED_FOR_PRODUCTION`, `ACTIVE`, `SUSPENDED`, `FAILED`, `RETIRED`.

## 5. Release gates

### Gate 0 — Discovery (current)
- Inventory repositories, existing PRs, connected accounts, Zapier MCP tool list, Vercel teams/projects, and existing Zaps.
- Record account identity and scope without changing resources.
- Mark unavailable integrations as blockers.

### Gate 1 — Sandbox foundation
- Complete Zapier OAuth in the user's MCP-compatible client.
- Discover the actual Zapier MCP tools and connected-app permissions.
- Map only supported read operations; perform a read-only smoke test.
- Configure sandbox connections and synthetic test records.

### Gate 2 — Workflow implementation
- Implement workflow templates in small batches by risk domain.
- Validate field mapping, duplicate handling, idempotency, retries and error paths.
- Test with synthetic data; capture run IDs and evidence.

### Gate 3 — Production review
- Security, privacy, compliance, business-owner and technical-owner review.
- Confirm least privilege, data retention, support ownership and rollback.
- Review each workflow's exact trigger, actions, records, recipients and side effects.

### Gate 4 — Explicit production authorization
- Obtain separate approval for each production workflow or bounded batch.
- Financial workflows require separate transaction-level approval.
- Enable only the approved version; verify a controlled first run and monitor.

## 6. Current integration facts and blockers

- GitHub connection is available and repository access was confirmed for the connected account.
- Existing implementation work is present in draft PR #6. It must remain draft until separately reviewed and approved.
- The PR documents a Zapier hosted MCP endpoint and client configuration example, but configuration alone does not complete OAuth or prove access to any Zapier account.
- Zapier's actual tool list and connected-app permissions are not currently visible in this execution context. Therefore no existing Zap inventory or Zap run history can yet be claimed.
- The connected Vercel account currently returns no visible projects or account-level integration configurations. Verify the intended Vercel team/account before assuming project absence or changing configuration.
- GitHub/Vercel CI checks on the existing PR head were reported successful during inspection; that validates those checks, not production readiness or a live Zapier connection.

## 7. Initial implementation sequence

1. Complete Zapier MCP OAuth and tool discovery.
2. Verify the intended Vercel team and canonical project.
3. Reconcile this catalogue with the actual app/trigger/action inventory and existing workflows.
4. Implement the 15 GitHub/Vercel workflows as sandbox-only templates.
5. Add finance and compliance workflows in read-only/proposal mode.
6. Expand across the remaining domains by risk tier and owner.
7. Present a workflow-by-workflow production approval pack.

**Non-goal:** this catalogue does not authorize bulk creation, activation, deletion, replacement, payment, posting, or deployment. Production mode is the target operating environment; production execution remains separately gated.
