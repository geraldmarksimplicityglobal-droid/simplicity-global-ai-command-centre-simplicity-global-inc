# SG-MS-PAYOUT-001 — Microsoft Partner Center earnings and payout adapter

**Parent module:** SG-FIN-001 Financial Intelligence System  
**Banking layer:** SG-BANKING-INFRA-001  
**Provider:** Microsoft Partner Center  
**Mode:** read-only source normalisation; no live API connection  
**Release state:** feature branch; not deployed

## 1. Purpose and separation

This adapter imports Microsoft-reported commercial Marketplace, Windows Store and partner incentive earnings/payment evidence into SG-FIN-001. It is an incoming-revenue evidence source, not a payment processor.

- Microsoft Partner Center is authoritative for its reported earnings and payment status.
- The receiving bank statement is authoritative for actual cash receipt.
- Xero remains the accounting system of record.
- Simplicity Global remains the orchestration, evidence and reconciliation layer; it is not a bank, payment rail or payout provider.
- Customer refunds, supplier payments, contractor payments and other outgoing disbursements remain in the provider-neutral payment orchestrator and are not Microsoft payouts.

## 2. Processing architecture

```text
Microsoft Partner Center exports / future approved read-only API
                         |
                         v
              Report schema validation
                         |
                         v
            Microsoft source normalisation
                         |
               +---------+---------+
               |                   |
               v                   v
        Earnings evidence     Payout evidence
               |                   |
               +---------+---------+
                         |
                         v
             Idempotency / collision gate
                         |
                         v
           SG-FIN-001 source-event registry
                         |
              +----------+-----------+
              |                      |
              v                      v
       Accounting draft       Bank match candidates
       (approved mapping)     (human confirmation)
              |                      |
              +----------+-----------+
                         |
                         v
               Xero remains ledger
```

No report is posted to Xero. No bank transaction is reconciled or marked received by this adapter.

## 3. Program and account model

Each source record retains a separate `programType` and opaque `sellerRef`. The initial supported program slugs are:

- `marketplace`
- `store`
- `incentives`

Additional program slugs may be accepted by the schema, but their eligibility and semantics must be verified before activation. A Marketplace Seller ID, Store publisher identity and Incentives program identity must not be silently merged.

## 4. Canonical earnings row

Required fields:

| Field | Meaning |
|---|---|
| `reportId` | Source report reference |
| `programType` | Program lane |
| `sellerRef` | Opaque internal seller reference; never a bank or tax identifier |
| `sourceRecordId` | Stable Microsoft row ID, when supplied |
| `earningDate` | Valid YYYY-MM-DD date within the report period |
| `currency` | Original source currency |
| `grossAmount` | Gross earnings |
| `feesAmount` | Non-negative fees |
| `withholdingAmount` | Non-negative withholding |
| `adjustmentAmount` | Signed adjustment |
| `netPayableAmount` | Reported net payable |
| `paymentStatus` | Raw source status, preserved without overwriting |

Canonical arithmetic:

```text
netPayable = gross + adjustment - fees - withholding
```

All arithmetic uses SG-FIN-001 integer minor-unit functions. Currency precision is enforced before comparison. The adapter rejects arithmetic mismatches; it does not silently repair the source row.

## 5. Canonical payout row

Payout evidence includes payout ID, program, seller reference, currency, amount, raw Microsoft status, observation timestamp, optional sent date, remittance reference and evidence reference.

The adapter preserves both:
- `rawStatus`: exact status text returned by Microsoft.
- `normalizedStatus`: conservative internal classification.

Only known exact statuses are mapped. Unknown statuses remain `unknown` and are routed for review. A Microsoft status of `sent` becomes `sent_by_microsoft`, not `bank_received`.

Every normalised payout has:
- `bankReceived: false`
- `reconciled: false`
- `postingAllowed: false`

## 6. Idempotency and exception handling

The source-event key is scoped by provider, program, seller reference and source record ID. If Microsoft omits a stable row ID, a deterministic SHA-256 digest of the canonical content is used.

- Same key and same content hash: duplicate; do not import again.
- Same key and changed content hash: collision; quarantine for review.
- Same source row ID in another program: distinct source event.
- Same row in a later report: duplicate if canonical content is unchanged.
- Invalid period, amount, currency or net arithmetic: exception; no silent correction.

Primary exception codes include `INVALID_REPORT`, `INVALID_EARNINGS_ROW`, `INVALID_PAYOUTS_ROW`, `INVALID_AMOUNT`, `DATE_OUTSIDE_PERIOD`, `CURRENCY_MISMATCH`, `NEGATIVE_FEE_OR_WITHHOLDING`, `NET_TOTAL_MISMATCH` and `IDENTIFIER_COLLISION`.

## 7. Bank settlement matching

Only payouts classified as `sent_by_microsoft` and carrying a sent date are considered for bank candidate generation. Existing SG-FIN-001 reconciliation logic matches exact currency and amount inside a configured date window and ranks reference matches.

Every result remains a `candidate` with `requiresHumanConfirmation: true`. The review helper classifies `SUGGESTED_MATCH`, `AMBIGUOUS_MATCH`, `CONFLICT`, `FX_REVIEW`, `AMOUNT_REVIEW`, `DATE_REVIEW`, `UNMATCHED` and `NOT_SENT`. All review outcomes retain `reconciled: false`. The operator must verify:
- exact amount and currency;
- remittance reference and remitter;
- booking date and value date;
- FX conversion, bank charges and withholding;
- partial, split, aggregated, returned or reversed settlements.

No bank transaction is mutated, matched or marked reconciled automatically.

## 8. Draft accounting proposal

`buildMicrosoftEarningJournalProposal` can produce a balanced journal proposal only after an explicitly approved account mapping is supplied. The mapping must identify distinct account codes for:
- Microsoft clearing;
- revenue;
- provider fees;
- withholding;
- adjustments.

The draft is balanced per source currency using SG-FIN-001 journal validation and always returns `postingAllowed: false`. The adapter does not guess account codes or decide whether withholding is an asset, expense or tax credit. That treatment belongs to the accountant/finance reviewer.

The Xero chart was inspected read-only and contains existing bank, revenue, fee, VAT and FX accounts. No account has been assigned to Microsoft earnings by this change. Preserve all current bank accounts and chart entries.

## 9. Microsoft API access gates

A future API adapter may use Microsoft's documented Earnings Service / Partner Payouts reporting APIs. Before enabling it:

1. Complete the outstanding Partner Center identity-verification request for an authorized user.
2. Confirm the legal entity, Marketplace/Store/Incentives program eligibility, Seller ID and Publisher Agreement status in the correct tenant.
3. Have the Microsoft tenant owner approve the exact Entra app registration, redirect URI and delegated permission set.
4. Use the documented Microsoft Dev Center API delegated `user_impersonation` permission and Microsoft Graph `User.Read` only if still required by the current API documentation and tenant consent flow.
5. Store credentials only in an approved managed vault; never in source, logs, browser storage or reports.
6. Handle rotating single-use refresh tokens atomically. Stop polling if token replacement fails; never retry a consumed token.
7. Start with report export creation/status/retrieval only. Do not call deletion operations.
8. Keep browser profile, tax, payout and bank-detail changes manual.

References:
- https://learn.microsoft.com/en-us/partner-center/developer/earnings-payments
- https://learn.microsoft.com/en-us/rest/api/partner-center/partner-payouts
- https://learn.microsoft.com/en-us/partner-center/account-settings/set-up-your-payout-account
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/payment-thresholds-methods-timeframes
- https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-geo-availability-currencies

## 10. Automation catalogue

| ID | Trigger | Action | Mode |
|---|---|---|---|
| SG-MS-AUTO-001 | New approved earnings export | Validate and stage rows | Read-only |
| SG-MS-AUTO-002 | Repeated source row | Deduplicate or collision-queue | Read-only |
| SG-MS-AUTO-003 | Microsoft payment status changes | Preserve raw status and emit status event | Read-only |
| SG-MS-AUTO-004 | Payout marked sent | Generate bank match candidates | Human review |
| SG-MS-AUTO-005 | Candidate ambiguous / FX / partial | Create exception task | Draft/alert |
| SG-MS-AUTO-006 | Approved account mapping exists | Prepare balanced journal proposal | Draft only |
| SG-MS-AUTO-007 | New report or payout exception | Notify finance reviewer | Draft/alert |
| SG-MS-AUTO-008 | Monthly reporting window | Produce earnings, withholding and settlement summary | Read-only |
| SG-MS-AUTO-009 | Token rotation / API failure | Stop polling and raise recovery alert | Safe stop |
| SG-MS-AUTO-010 | Profile/tax/bank destination needs change | Require human approval and manual portal action | Disabled automation |

These are workflow contracts, not connected Zapier tasks. No Zapier connection or Microsoft API authorization is established by this source change.

## 11. Verified readiness state — 25 November 2026

- Windows Dev Center welcome notice confirms the publisher account was created with publisher name “S I M P L I C I T Y G L O B A L”.
- A Microsoft Partner Center notice dated 23 November 2026 says more information is required and at least one user must complete identity verification. This remains an operator action; completion is not evidenced.
- The connected Xero organisation is SIMPLICITY GLOBAL, ZA, ZAR, Africa/Johannesburg. Existing bank accounts and chart of accounts remain unchanged.
- No Partner Center API app registration, tenant consent, report download, payout-profile validation or tax-profile validation is verified.
- Vercel returned zero projects for the connected account and default team.
- The source adapter and tests are implemented on a feature branch. It is not deployed or connected to a live Microsoft tenant.

## 12. Release controls

No database migration, secret creation, Microsoft consent, Xero write, journal posting, bank reconciliation acceptance, payout-profile change, tax submission, outgoing payment, Vercel deployment or production release is included.

The feature must pass CI, be reviewed into SG-FIN-001, then complete separate tenant-owner, finance/accounting, security and production approvals before any live connector or financial write is enabled.
