# SG-MICROSOFT-PAYOUTS-001 — Microsoft Payouts Integration

**Status:** Architecture integrated on feature branch; implementation and live account state remain unverified  
**Branch:** `feature/sg-microsoft-payouts-001`  
**Parent systems:** GEN SYSTEM · `SG-BANKING-INFRA-001` · Financial Intelligence · Compliance Engine  
**Operating mode:** Read-only discovery and reporting first; explicit approval for financial or production changes

## 1. Purpose and scope

Provide one controlled subsystem for:

1. Microsoft Store / Windows Dev Center publisher earnings.
2. Microsoft Marketplace seller earnings and payouts.
3. Microsoft partner incentive earnings and payouts.
4. Earnings, payment and bank-settlement reconciliation into Simplicity Global accounting.
5. Payout readiness, tax-profile evidence and compliance tracking.
6. A separate, approval-gated outgoing-disbursement workflow for suppliers, customers and contractors.

**Boundary:** Partner Center is an earnings and payout source for Microsoft-originated revenue. It is not a general-purpose outgoing payment rail. Outgoing disbursements must use an independently verified bank or payment-provider connector registered in `SG-BANKING-INFRA-001`.

## 2. Read-only inspection baseline (25 November 2026)

### Connected systems inspected

| Surface | Observed evidence | Consequence |
|---|---|---|
| GitHub command-centre repository | Existing repository and `codex/live-enterprise-framework` branch | Extend through this feature branch; do not overwrite the existing branch |
| GitHub Marketplace repository | Private Go API baseline; README describes domain, web, infrastructure and controlled deployment workflow | Reuse its marketplace boundary; no payout code was found in the targeted code search |
| Partner Center skill repository | Private onboarding skill; README already covers publisher verification, roles, agreement gate, seller ID, payout/tax readiness, offer preparation and earnings reconciliation | Reuse this workflow; do not create a duplicate onboarding assistant |
| Vercel | No projects returned for the connected account/team | No Vercel project or deployment is verified by this inspection |
| Outlook | Microsoft Partner Center identity-verification request for Simplicity Global received 23 Nov 2026; Windows Dev Center welcome email received 22 Nov 2026 | Identity verification needs operator attention; publisher account creation is evidenced, payout setup is not |
| Xero | One connected organisation: SIMPLICITY GLOBAL; country ZA; base currency ZAR; timezone Africa/Johannesburg | Use this organisation as the accounting integration target |
| Xero chart of accounts | Existing active bank accounts named “Simplicity Global” and “Flexible Savings Account”; Sales, Other Revenue, Bank Fees, FX and tax accounts exist | Preserve current accounts; no new accounts or mappings are created by this specification |

### Current status classification

- **Confirmed:** a Windows Dev Center publisher welcome email exists and identifies the publisher display name as Simplicity Global.
- **Confirmed:** a Partner Center email requests additional identity-verification information.
- **Confirmed:** the Xero organisation is configured as ZA / ZAR.
- **Not confirmed:** Partner Center identity verification completion, legal-entity verification completion, Publisher Agreement acceptance, seller ID(s), payout profile status, tax profile status, bank destination, currency assignment, incentive enrollment, Marketplace transactable-offer eligibility, or any Microsoft earnings/payment balance.
- **Not confirmed:** any live Microsoft Partner Center API registration or credential.
- **Not confirmed:** any Vercel deployment for this workstream.

Email evidence is not a substitute for inspecting the live Partner Center status pages.

## 3. Microsoft program lanes

Keep each Microsoft program distinct in the registry. Do not assume a tax or payment profile can be reused across programs.

| Lane ID | Program | Scope |
|---|---|---|
| `SG-MS-STORE` | Windows Dev Center / Microsoft Store | App and in-app purchase earnings, tax and payout readiness |
| `SG-MS-MARKETPLACE` | Microsoft Marketplace | Transactable offers, add-ons, earnings, payment statements |
| `SG-MS-INCENTIVES` | Microsoft partner incentives | Program/location enrollment, incentive earnings, tax and payout profiles |
| `SG-MS-OUTBOUND` | Simplicity Global outgoing disbursements | Separate bank/provider payment workflow; not a Partner Center payout capability |

Each lane must store its Microsoft program identifier, seller ID or partner location identifier where applicable, legal entity reference, profile statuses, currencies, permissions, evidence references and last verification time. Never store full bank details, tax identifiers, identity-document numbers, passwords, access tokens or refresh tokens in the application database or repository.

## 4. GEN SYSTEM integration architecture

```text
GEN SYSTEM CONTROL PLANE
  ├─ Identity, roles, policy and approval gate
  ├─ Universal Plugin / Connector Registry
  ├─ Compliance and evidence ledger
  └─ Financial Intelligence
       ├─ Microsoft Payout Connector
       │    ├─ Store / Windows Dev Center adapter
       │    ├─ Marketplace Earnings and Payments adapter
       │    └─ Incentives adapter
       ├─ Report ingestion and normalisation
       ├─ Payout lifecycle and exception monitor
       ├─ Reconciliation engine
       └─ Accounting export / Xero adapter
              |
       SG-BANKING-INFRA-001
         ├─ Existing verified bank connections (if any)
         └─ Separate approved outbound payment providers
```

Simplicity Global remains the platform, aggregation and orchestration layer. It is not classified as a bank, payment rail, sponsor bank or licensed payment institution by virtue of this integration.

## 5. Connector design

### Read-only earnings and payment data

Use Microsoft's documented Earnings Service / Partner Payouts APIs where the relevant program and account permissions permit. The API documentation describes asynchronous earnings and payment export requests and retrieval by request ID. Where API access is unavailable, use operator-downloaded Partner Center CSV/TSV reports as the initial ingestion path.

- Begin with read-only report access.
- Verify the current API contract, endpoint version, permissions, throttling, pagination, report schemas and supported program coverage before implementation.
- Use Microsoft Entra delegated authorization only after an administrator has reviewed the exact permissions.
- Keep credentials in an approved secret vault; rotate and replace refresh tokens atomically because Microsoft's documented refresh-token flow returns a replacement token.
- Never automate acceptance of agreements, identity verification, tax submissions, payout-profile creation/changes, payment holds, or bank-detail submissions.
- Treat all imported reports as untrusted input; validate schema, currency, dates, identifiers and totals before posting.

### Normalised data entities

- `MicrosoftProgram`
- `PublisherSeller`
- `PartnerLocation`
- `EarningLine`
- `PaymentStatement`
- `PayoutBatch`
- `TaxWithholdingLine`
- `FeeAdjustment`
- `FxConversion`
- `SettlementMatch`
- `EvidenceRecord`
- `ApprovalRecord`

Every imported row must retain source program, source report, source row identifier, source period, original currency and amount, payout currency and amount when supplied, exchange-rate metadata when supplied, ingestion timestamp, schema version and content hash. Enforce idempotency using stable Microsoft identifiers where present, with a deterministic fallback hash. Do not merge rows from different Microsoft programs merely because amounts or dates match.

## 6. Payout lifecycle and reconciliation

Use a controlled state model:

`DISCOVERED → PROFILE_ACTION_REQUIRED → PROFILE_PENDING_VALIDATION → PAYOUT_READY → EARNED → MATURED → PAYMENT_PROCESSED → SENT_BY_MICROSOFT → BANK_RECEIVED → RECONCILED`

Exceptional states: `ON_HOLD`, `UNCOLLECTED`, `ACTION_REQUIRED`, `REJECTED`, `RETURNED`, `DISPUTED`, `DUPLICATE_REVIEW`.

Do not infer that “earned” means payable or that “processed” means cash has arrived. Match Microsoft payment IDs and statements to bank-statement lines using amount, currency, value date, reference and provider identifiers. Route unmatched, short-paid, FX-different, withheld, reversed or duplicate items to an exception queue; never auto-write off differences.

## 7. Xero accounting integration

The connected Xero organisation is ZA / ZAR. Its existing chart includes two active BANK-type ledger accounts and revenue/expense/tax accounts. Preserve the existing chart and account identities.

Proposed accounting treatment (subject to accountant approval):
- Microsoft Store and Marketplace sales: classify from the underlying transaction and applicable agreement, not simply from the net payout amount.
- Partner incentives: keep separate from product sales until the correct revenue classification is confirmed.
- Microsoft fees, refunds, chargebacks and adjustments: separate line items, not netted silently.
- Foreign-currency earnings and settlements: retain original currency, payout currency and Microsoft exchange-rate metadata; reconcile realised FX separately.
- Withholding taxes: capture as a distinct tax/withholding item and do not automatically treat it as a deductible expense or recoverable asset.
- Settlement: use an appropriate clearing/reconciliation account only after the accountant approves the account design.

No Xero chart-of-accounts records, bank feeds, invoices, bills, journals, tax rates or bank destinations are changed by this document. No new clearing account is created.

## 8. South Africa and currency readiness

The inspected Xero organisation is configured as South Africa (ZA), with ZAR base currency. Microsoft's current payout-method table lists South Africa as supported for Microsoft Marketplace, Microsoft Store/Minecraft/Flight Simulator and PayPal payments. This is country-level availability only; the actual methods, bank fields, currency choices and eligibility shown for the publisher's selected program and account must be verified in Partner Center.

Microsoft documentation states that payout profiles are program-specific, that each seller ID maps to one tax profile and one payment profile at a time, and that profile validation can take up to 48 hours. Microsoft also states that non-US publishers selling transactable Marketplace offers complete the applicable US tax form (generally W-8); country-specific requirements and tax-treaty claims require review by the company's tax adviser.

Do not assume ZAR is an available payout currency merely because the Xero base currency is ZAR. Confirm the selectable currency and receiving-bank acceptance in the live Partner Center profile.

## 9. Security, compliance and operational controls

- Least-privilege, read-only API access for report ingestion.
- MFA and delegated user consent controlled by the Microsoft account owner.
- Secrets stored only in a managed vault; no secrets in GitHub, logs, emails or reports.
- Encryption in transit and at rest; signed webhook verification if a supported webhook is later introduced.
- Role separation between report reader, finance reviewer, tax reviewer and payment approver.
- Dual approval for journal posting, bank-account changes, payout-profile changes, payment holds and outbound payments.
- Immutable audit record for report import, validation, reconciliation, exception resolution and approvals.
- POPIA and applicable South African tax, accounting, record-retention and cross-border data requirements reviewed before production.
- No automated tax/legal advice, agreement acceptance, identity verification, payout setup submission or disbursement.

## 10. Automation catalogue

| Automation ID | Trigger | Action | Mode |
|---|---|---|---|
| `SG-MS-AUTO-001` | Scheduled report window | Fetch permitted earnings/payment exports | Read-only |
| `SG-MS-AUTO-002` | New report | Validate, hash and ingest rows | Staging |
| `SG-MS-AUTO-003` | New payout statement | Reconcile to earning lines | Staging |
| `SG-MS-AUTO-004` | Payment expected but not received | Create finance exception and alert | Read-only |
| `SG-MS-AUTO-005` | New bank statement line | Suggest Microsoft settlement match | Suggest only |
| `SG-MS-AUTO-006` | Month-end close | Produce program/currency reconciliation pack | Read-only |
| `SG-MS-AUTO-007` | Profile status changes | Notify authorised account/finance owners | Notify only |
| `SG-MS-AUTO-008` | Tax or verification action required | Create evidence checklist and operator task | Human action |
| `SG-MS-AUTO-009` | Approved accounting batch | Prepare Xero draft journal/import | Draft only; posting requires approval |
| `SG-MS-AUTO-010` | Approved supplier/customer payment request | Hand off to approved outbound provider | Disabled until separate approval |

No Zapier, GitHub Actions, Vercel, bank or Xero write automation is activated by this specification.

## 11. Existing Partner Center skill reuse

Reuse `simplicity-global-partner-center-skill` as the human-operated onboarding and evidence assistant. Its documented safety model blocks sensitive fields and protected controls and does not submit, accept, authorize, publish or certify forms. Its documented workflow already includes identity verification, role review, Publisher Agreement review, seller ID capture, payout/tax readiness, offer preparation, certification evidence and payout reconciliation.

Extend that skill only after inspecting its full workflow and tests. Keep all protected Partner Center submissions manual. Do not place secrets or sensitive bank/tax information in its `config/company.json` file.

## 12. Delivery stages and approval gates

| Stage | Deliverable | Gate |
|---|---|---|
| 0 — Account readiness | Operator completes outstanding identity/business verification and confirms program roles | Human action in Partner Center |
| 1 — Payout readiness | Confirm seller IDs, program agreements, tax profiles, payment profiles and currencies | Explicit approval before any profile submission/change |
| 2 — API readiness | Register and review a least-privilege Microsoft Entra app; test read-only report access | Explicit security/admin consent |
| 3 — Data integration | Build report adapters, schema validation, idempotent staging and audit | Non-production test |
| 4 — Accounting | Approve Xero mappings and clearing-account design; prepare draft journals | Accountant/finance approval |
| 5 — Reconciliation | Compare reports, payment statements and bank evidence | Finance sign-off |
| 6 — Production monitoring | Enable read-only scheduled ingestion and alerts | Separate production approval |
| 7 — Outbound disbursements | Connect a verified bank/provider and enforce dual approval | Separate financial approval per provider and transaction policy |

## 13. Acceptance criteria

- Existing repositories, branches, accounts, bank feeds, chart of accounts and credentials remain unchanged.
- Each Microsoft program is separately identified and permission-scoped.
- No secret or sensitive banking/tax/identity data is stored in source control.
- Imports are schema-validated, idempotent and auditable.
- Earnings, payments and bank settlements remain distinct records.
- Currency, fees, refunds, tax withholding and FX are separately represented.
- Reconciliation exceptions are visible and never silently written off.
- Xero changes are drafts until approved.
- No protected Partner Center submission or outgoing payment can be triggered by automation.
- Production activation requires a recorded approval and a verified rollback plan.

## 14. Official Microsoft references

- [Set up Microsoft Marketplace payout and tax profiles](https://learn.microsoft.com/en-us/partner-center/account-settings/set-up-your-payout-account)
- [Payout details by region](https://learn.microsoft.com/partner-center/marketplace-offers/payment-thresholds-methods-timeframes)
- [Understand the Partner Center verification process](https://learn.microsoft.com/en-us/partner-center/enroll/understand-the-verification-process)
- [Manage earnings using the Earnings Service API](https://learn.microsoft.com/en-us/partner-center/developer/manage-payouts)
- [Manage earnings and payment exports](https://learn.microsoft.com/en-us/partner-center/developer/manage-earnings)
- [Earnings in Partner Center](https://learn.microsoft.com/en-us/partner-center/earnings/earnings)
- [Getting paid in Microsoft Marketplace](https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-get-paid)

---
**Implementation note:** This file is an architecture and controlled delivery specification committed to a feature branch. It does not represent a live Partner Center connection, validated payout profile, accounting posting, or production deployment.
