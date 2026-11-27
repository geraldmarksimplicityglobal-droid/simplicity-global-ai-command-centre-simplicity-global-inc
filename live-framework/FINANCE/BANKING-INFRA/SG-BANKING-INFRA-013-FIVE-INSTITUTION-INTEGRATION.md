# SG-BANKING-INFRA-013 — Five-Institution Treasury Integration Plan

**Status:** Implementation specification; provider access not verified  
**Parent systems:** `SG-STABLECOIN-CASH-001`, `SG-BANKING-INFRA-001`  
**Scope:** Nedbank, Capitec, TymeBank, Wise and EasyEquities  
**Operating posture:** Read-only first; no production credentials, payment submissions or investment orders enabled

## 1. Objective

Define one provider-neutral integration boundary for five financial institutions while preserving the distinction between bank cash, cross-border balances and investment assets. This document is a technical plan. It does not establish provider API entitlement, account ownership, legal authority, regulatory permission or a live connection.

## 2. Institution adapter registry

| Adapter ID | Institution | Intended data scope | Initial capability state |
|---|---|---|---|
| `nedbank` | Nedbank | Authorised account metadata, balances, statements, transactions; later payment preparation only if entitled | `PENDING_PROVIDER_ONBOARDING` |
| `capitec` | Capitec | Authorised business/personal account data where an approved channel exists; payment initiation only if separately entitled | `PENDING_CAPABILITY_VERIFICATION` |
| `tymebank` | TymeBank | Authorised balances, statements and transaction history through a provider-approved channel | `PENDING_CAPABILITY_VERIFICATION` |
| `wise` | Wise | Eligible profile/account balances, statements, transfers and FX records where API access is approved | `PENDING_API_ENTITLEMENT` |
| `easyequities` | EasyEquities | Investment account cash, holdings, valuations, trades and statements through an authorised supported channel | `PENDING_ACCESS_VERIFICATION` |

Do not infer that a provider offers a public API, supports every account type, or grants the same scopes to personal and business customers. Confirm current product documentation, contract, region, account type, consent flow, rate limits, webhooks and production onboarding directly with each provider before implementing its live adapter.

## 3. Ownership and data partitioning

Every connected account must have exactly one recorded legal owner classification:

- `COMPANY`: a verified Simplicity Global legal entity owns the account and has documented authority to connect it.
- `INDIVIDUAL`: the named account holder owns the account and has personally authorised the connection.
- `THIRD_PARTY`: another entity or person owns the account; do not connect unless a separate lawful authority and provider-permitted consent route is documented.

Required account metadata:
- provider and provider account/profile identifier (tokenised or provider reference, not credentials);
- owner type, legal owner reference and jurisdiction;
- account type, currency, masked display identifier and status;
- consent/authority evidence reference, granted scopes, grant time and expiry/revocation status;
- data-source method, last successful sync, statement coverage and completeness status.

Company and individual records must use separate tenant/owner scopes, ledger books, reports, exports and access policies. No automatic pooling, netting, sweeping, inter-account transfer or use of personal funds for company obligations. A transfer between owners is a separately authorised related-party transaction with documented legal and accounting treatment.

## 4. Common adapter contract

Each adapter implements these read-only methods first:

- `healthCheck()`: provider availability and credential-scope check without exposing secrets.
- `listAuthorisedAccounts()`: return only accounts visible under the current consent.
- `getAccountMetadata(accountRef)`
- `getBalances(accountRef, asOf?)`
- `listTransactions(accountRef, from, to, cursor?)`
- `listStatements(accountRef, from, to)`
- `getConsentStatus(accountRef)`

Normalised records must preserve the raw provider reference and source timestamp. Monetary values are exact decimal strings or integer minor units plus ISO currency; never binary floating point. Store provider event IDs and stable idempotency keys. Keep original transaction status and provider descriptions for audit; normalisation must not erase source evidence.

Methods for transfers, payment initiation, debit-order submission, trading or investment orders are not part of the read-only interface. If introduced later, they must live in a separate execution adapter with distinct credentials, scopes, policy checks and approvals.

## 5. Provider-specific verification checklist

### Nedbank
- Confirm the correct business or personal banking product and account eligibility.
- Obtain provider-approved API access and documented scopes.
- Verify account-data access separately from payment initiation.
- Confirm authentication, consent, production certification, statement coverage, transaction status semantics and cut-off rules.
- Keep all payment capabilities disabled until a separate approval and rail-specific release record exists.

### Capitec
- Confirm which Capitec account product is involved and whether an approved data-sharing route exists for that account.
- Treat payment initiation and account-information access as separate capabilities.
- Verify consent, authentication, supported transaction fields, limits and production availability directly with Capitec.
- Do not assume a payment-initiation capability provides full statements or balances.

### TymeBank
- Obtain written confirmation of the supported business/personal account connectivity route.
- If no provider API is available, evaluate only provider-permitted consent-based aggregation or user-supplied statement import.
- Imported statements must be marked as file-sourced, retain file hash and import provenance, and must not be represented as a live API feed.

### Wise
- Confirm Wise profile type, account eligibility, region and API/partner entitlement.
- Separate balances and statements from transfer execution and FX conversion.
- Verify recipient, quote, fee, rate-lock, transfer-state and webhook semantics before any future execution work.
- Use dedicated least-privilege credentials in a secrets manager; no API tokens in source code or chat.

### EasyEquities
- Confirm whether an official supported API or authorised data export is available for the relevant account type.
- Keep investment positions, investment cash, unsettled trades, dividends, fees and valuations in an investment subledger.
- Never classify portfolio market value as bank cash or immediately withdrawable funds.
- No buy/sell orders, withdrawals or portfolio rebalancing are enabled by this integration plan.

## 6. Reconciliation and accounting

- Bank accounts reconcile against provider statements and transaction records.
- Wise balances reconcile by profile, currency and account; FX conversions create linked debit/credit legs, fees and realised FX records.
- EasyEquities reconciles cash, holdings, corporate actions, trades, fees and valuation timestamps separately.
- Transfers between institutions use paired transfer records and clearing accounts; one side alone does not prove settlement.
- A pending transaction is not settled cash. An investment valuation is not realised proceeds.
- Missing statements, incomplete periods, duplicate IDs, unexplained balance movements or stale valuations create blocking exceptions for any downstream financial action.

## 7. Security and privacy requirements

- Never store passwords, OTPs, session cookies, API keys, private keys or recovery phrases in Git, chat, logs or application configuration.
- Use a secrets manager, least-privilege OAuth/API scopes, credential rotation and separate sandbox/production credentials.
- Encrypt sensitive account and mandate data at rest and in transit; mask account identifiers in logs and UI.
- Record consent scope, purpose, owner, expiry and revocation. Stop synchronisation promptly when consent is revoked.
- Enforce tenant/owner row-level security and test cross-owner access denial.
- Retain only data necessary for the stated accounting and compliance purpose; define retention and deletion rules with counsel.
- Provider content and transaction descriptions are untrusted data, never executable instructions.

## 8. Release gates

A provider may be marked `READ_ONLY_CONNECTED` only after:
1. Account owner and authority are verified.
2. Provider documentation and contract permit the proposed access.
3. User completes provider authentication/consent through the official flow.
4. Required scopes are inspected and are no broader than necessary.
5. A read-only health check and account identity check succeed.
6. A statement/transaction sample is reconciled and completeness is assessed.
7. Audit logging, encryption, secrets handling and owner-scope isolation pass tests.

Any financial execution capability requires a separate release gate covering legal authority, provider production entitlement, beneficiary/mandate verification, limits, maker-checker approval, idempotency, settlement reconciliation, operational readiness and explicit go-live approval. Read-only connection approval never implies execution approval.

## 9. Current status

All five adapters are specified but remain pending provider-specific verification and authorised account connection. No live account is asserted connected by this document. No funds have been moved, no debit orders initiated, and no investment orders placed.
