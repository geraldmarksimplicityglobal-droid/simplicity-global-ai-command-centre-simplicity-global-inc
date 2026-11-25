# GEN SYSTEM Registry Entry — SG-MICROSOFT-PAYOUTS-001

**Parent:** GEN SYSTEM Financial Intelligence & Governance  
**Banking registry:** `SG-BANKING-INFRA-001`  
**Capability class:** External publisher earnings and payout reporting connector  
**Provider:** Microsoft Partner Center / Microsoft Marketplace  
**Lifecycle:** Design accepted; implementation and tenant verification pending  
**Default execution:** Read-only  
**Production state:** Not activated

## Purpose

Register Microsoft Partner Center as an external source of publisher earnings, payment reports, payout status and eligible partner incentive evidence. Feed verified records into GEN SYSTEM Financial Intelligence and Simplicity Global's Banking Infrastructure reconciliation layer.

Microsoft is an external payout originator and reporting provider in this architecture. It is **not** classified as a bank, payment rail, sponsor bank, or Simplicity Global payment processor.

## System placement

```
GEN SYSTEM Governance / Identity / Audit
  -> Microsoft Partner Center Adapter (SG-MS-PAYOUT-001)
  -> Earnings & Payments Report Ingestion
  -> Financial Intelligence / FX / Tax / Accounting Drafts
  -> SG-BANKING-INFRA-001
       -> existing bank statement and transaction connections (read-only)
       -> settlement reconciliation and exception handling
```

Outgoing supplier, customer, contractor or partner disbursements remain a separate capability in the provider-neutral Payment Orchestrator. Microsoft Partner Center reporting APIs must not be used to execute outgoing payments.

## Subsystem catalogue

| Identifier | Capability | Default state |
|---|---|---|
| SG-MS-PAYOUT-001 | Partner Center provider and seller/program registry | Read-only |
| SG-MS-PAYOUT-002 | Earnings report ingestion | Read-only |
| SG-MS-PAYOUT-003 | Payments report and payout-status ingestion | Read-only |
| SG-MS-PAYOUT-004 | Payout/tax profile readiness evidence | Manual evidence only |
| SG-MS-PAYOUT-005 | Bank settlement reconciliation | Read-only |
| SG-MS-PAYOUT-006 | Financial intelligence and reporting | Read-only |
| SG-MS-PAYOUT-007 | Accounting journal proposal/export | Draft only |
| SG-MS-PAYOUT-008 | Exception, discrepancy and audit monitoring | Alert-only |
| SG-MS-PAYOUT-009 | Marketplace offer/revenue attribution | Read-only |
| SG-MS-PAYOUT-010 | Outgoing payment orchestration bridge | Disabled; separate approval |
| SG-MS-PAYOUT-011 | Incentives and eligible commission evidence | Read-only |
| SG-MS-PAYOUT-012 | Audit and evidence register | Append-only |

## Banking infrastructure integration

- Register Microsoft under external payout originators/provider integrations.
- Reuse the existing Bank Connector Engine and statement ingestion interfaces; do not create or replace bank accounts or bank connections.
- Reconcile Microsoft payment reports against approved bank statement data.
- Keep Microsoft-side payment status distinct from actual bank settlement status.
- Preserve gross earnings, Microsoft fees, adjustments, withholding, currency, FX rate/date and net payable as separate values.
- Send ambiguous, partial, reversed, FX-converted or mismatched settlements to manual review.
- Generate accounting drafts only; posting remains under existing finance approval controls.

## Security and approvals

- Microsoft OAuth authorization is not yet configured.
- Use delegated least-privilege access and MFA; grant only the current Microsoft-documented Partner API permissions after tenant-owner approval.
- Store access/refresh tokens and any client credential only in an approved managed vault. Never commit secrets or financial identifiers.
- Treat refresh tokens as rotating, single-use values and atomically persist replacements.
- No automated payout-profile, bank-detail, tax-profile or agreement changes.
- No automatic certification submission, payment instruction, journal posting or outgoing transfer.
- Production activation requires separate security, compliance, finance and management approval.

## Country and currency guardrail

Microsoft's published Marketplace country table lists South Africa with USD as Marketplace transaction currency. Its payout-method table lists South Africa as supported for Marketplace payouts and PayPal. Marketplace transaction currency does not determine the payout currency selected in Partner Center. The receiving bank must accept the selected payout currency. Do not assume ZAR or change any payout profile until the actual Partner Center options and receiving-bank capability are verified.

## Current implementation evidence

- Existing Partner Center skill repository contains onboarding workflow, manual protected gates, evidence tracking, a browser helper, CLI runner and tests.
- Existing Marketplace repository declares a `payouts` module name but does not yet expose a payout API/service in the inspected Go source.
- Marketplace CI previously passed Go tests, vet and Docker build, but failed the Anchore/Grype image scan at the configured high-severity threshold. Resolve that security finding before extending or deploying the Marketplace service.
- Partner Center CI previously failed its validation fixture test. The fixture has been changed to synthetic HTTPS URLs and additional assertions; the exact updated branch commit still requires a fresh hosted CI run before merge.

## Implementation source of truth

Detailed API, normalized data model, reconciliation, approval matrix, test scope and Microsoft references:

`simplicity-global-partner-center-skill/docs/SG-MS-PAYOUTS-001.md`

Repository: https://github.com/geraldmarksimplicityglobal-droid/simplicity-global-partner-center-skill

## Acceptance criteria

- Existing banking accounts and connections remain unchanged.
- No raw tokens, passwords, full bank account numbers, tax identifiers or identity numbers enter Git or logs.
- Earnings and payment reports are imported idempotently and traceably.
- Bank reconciliation is read-only and requires human review for ambiguity.
- Accounting outputs remain drafts until approved.
- Outgoing payment execution remains disabled until separately authorized.
- All automated tests and security scans pass before merge/deployment.
- No production deployment or financial profile changes occur without explicit approval.
