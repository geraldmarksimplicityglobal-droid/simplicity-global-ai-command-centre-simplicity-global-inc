# Release and security gates

This checklist is mandatory before the prototype can be considered for production.

## Gate A — provider and account selection
- [ ] Confirm the approved hosting provider and region.
- [ ] Confirm database provider, data residency and backup region.
- [ ] Confirm identity provider and supported MFA methods.
- [ ] Inspect current accounts, billing limits and existing projects.
- [ ] Document data-processing terms and subprocessors.

## Gate B — application security
- [ ] Replace localStorage as the authoritative store with authenticated APIs.
- [ ] Implement server-side authentication and role/entity authorisation.
- [ ] Test cross-organisation access denial.
- [ ] Add CSRF protections where relevant, input validation and output encoding.
- [ ] Add rate limits, secure headers and dependency scanning.
- [ ] Ensure secrets are held only in a secret manager.
- [ ] Verify no credentials, tokens or sensitive personal data enter logs.

## Gate C — data and audit
- [ ] Apply row-level security and least-privilege database grants.
- [ ] Make audit events append-only for application roles.
- [ ] Add evidence integrity checks and controlled retention.
- [ ] Encrypt data in transit and at rest.
- [ ] Test backup restore and document RPO/RTO.
- [ ] Complete privacy impact and data-processing assessments.

## Gate D — quality and operations
- [ ] Unit and integration tests pass.
- [ ] Security testing and independent review completed.
- [ ] Monitoring, alerting and incident response are operational.
- [ ] Disaster recovery and rollback procedures are tested.
- [ ] Accessibility and browser compatibility are checked.
- [ ] Legal and governance owners approve relevant policies.

## Gate E — release authorisation
- [ ] Staging deployment approved and verified.
- [ ] Production change request identifies exact resources and impact.
- [ ] Explicit approval obtained for production deployment and any spend.
- [ ] Release owner, rollback owner and maintenance window recorded.
- [ ] Post-release smoke tests and evidence captured.

**No gate is considered passed based solely on this checklist being checked. Attach evidence and reviewer identity. Approval records are not deployment commands.**
