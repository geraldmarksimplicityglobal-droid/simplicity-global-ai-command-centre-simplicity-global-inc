# SG-STABLECOIN-CASH-001 — Institution Adapter Register

**Status:** Implementation specification; provider connections not authenticated
**Branch:** `codex/sg-stablecoin-cash-001`
**Mode:** Read-only first; no payment, debit, withdrawal, trade or transfer execution enabled

## 1. Scope

This register covers Nedbank, Capitec, TymeBank, Wise and EasyEquities. It also defines reconciliation interfaces for Stripe and PayPal already identified in the wider treasury scope.

The register does not assert that any institution has granted API access. Each adapter remains `not_connected` until an authorised consent/OAuth or provider-issued integration is completed and a read-only health check succeeds.

## 2. Ownership and accounting boundaries

Every external account must be attached to exactly one ownership boundary:
- `company`: a verified Simplicity Global legal entity owns the account and the entity's authorised representative grants access.
- `personal`: the verified individual account holder grants access.
- `third_party`: an independently authorised party; disabled until its legal basis and scope are documented.

Company and personal accounts must never be pooled, netted, swept or used to fund each other by default. Consolidated dashboards may display both only with explicit account-holder consent and clear ownership labels. Investment holdings and customer funds remain separate ledger classes.

## 3. Institution adapter matrix

| Institution | Intended read scope | Future write scope | Initial state |
|---|---|---|---|
| Nedbank | Account metadata, balances, statements, transactions where API entitlement permits | Approved payments or collections only where contract, scheme and authority permit | `pending_provider_verification` |
| Capitec | Account/payment information only through a verified supported business or open-banking route | Payment initiation only if explicitly supported and authorised | `pending_provider_verification` |
| TymeBank | Account and transaction visibility only through a verified bank-approved interface | Disabled until provider capability and authority are verified | `pending_provider_verification` |
| Wise | Profiles, balances, statements, quotes and transfer status within granted API scopes | Transfer creation only after separate release gates | `pending_oauth` |
| EasyEquities | Portfolio positions, cash balances, transactions and valuations only through an authorised supported data route | Trading, withdrawals and deposits disabled; not a bank-payment adapter | `pending_provider_verification` |
| Stripe | Payout/settlement and balance transaction reconciliation where connected account permissions allow | No payout initiation in this subsystem | `test_account_only_unverified_for_production` |
| PayPal | Transaction, invoice and settlement reconciliation where connected permissions allow | No payout initiation capability assumed | `read_scope_to_verify` |

## 4. Common adapter contract

Each provider adapter must implement the following logical operations where the provider actually supports them:

- `healthCheck()`: report authentication state, granted scopes, environment and last successful read.
- `listAccounts()`: return only accounts visible under the current consent.
- `getBalances(accountRef)`: preserve provider currency and as-of timestamp.
- `getTransactions(accountRef, cursor, dateRange)`: return stable provider IDs, booking/value dates, amount, currency, status and raw-evidence reference.
- `getStatements(accountRef, dateRange)`: retrieve statement evidence where available.
- `getTransferStatus(providerReference)`: status lookup only; never infer settlement from request acceptance.
- `createPayment()`, `createDebitOrder()`, `createTrade()` and `withdraw()`: not implemented in the initial adapter contract; must remain unavailable until separate provider-specific approval and release.

Adapters must not scrape consumer banking portals, collect passwords or OTPs, bypass MFA, or store provider credentials in source control.

## 5. Canonical account record

Required fields:
- internal account ID (opaque UUID)
- provider and provider account reference (encrypted/tokenised where sensitive)
- owner type and verified owner/entity reference
- account product/type
- currency (ISO 4217)
- display label (redacted)
- consent reference, granted scopes, consent timestamp and expiry/revocation state
- connection environment (sandbox/production)
- adapter version and last successful health-check time
- data freshness and completeness markers

Do not store online banking passwords, card security codes, OTPs, private keys, seed phrases or full credentials in this record.

## 6. Ledger separation

Use separate ledger books or mandatory ownership dimensions:
- company fiat cash
- personal fiat cash
- Wise multi-currency balances
- investment cash and securities
- PSP clearing/settlement balances
- customer funds (separately controlled; never treated as company revenue)
- watch-only EVM assets

A transfer between two accounts is not automatically income or expense. Record both legs, fees and FX conversion explicitly. EasyEquities securities must not be represented as immediately available bank cash. Market value and withdrawable cash must be distinct.

## 7. Reconciliation and exception rules

- Use provider transaction IDs and account IDs as idempotency keys.
- Preserve original provider payloads in encrypted evidence storage with access controls and retention policy.
- Reconcile by amount, currency, dates, references and status; never match on amount alone.
- Keep pending, booked, settled, failed, reversed, returned and disputed states distinct.
- Unknown, duplicate, stale or conflicting items enter an exception queue.
- Do not silently overwrite posted journal entries; use compensating entries.
- Record provider timezone and normalise event timestamps to UTC; apply `Africa/Johannesburg` for local scheduling and display.

## 8. Consent, identity and release gates

Before connecting an account:
1. Verify whether it is company-owned, personal or third-party.
2. Verify the legal entity or account holder and authority to grant access.
3. Obtain provider-supported consent and least-privilege scopes.
4. Record privacy notice, purpose, retention and revocation handling.
5. Complete a read-only health check and compare retrieved account identity with independently verified evidence.
6. Run a read-only parallel reconciliation before enabling any preparation workflow.

Before any write operation, require separate provider capability evidence, legal/compliance review, mandates where relevant, beneficiary verification, limits, maker/checker approval, idempotency, audit, kill switch, sandbox certification and explicit go-live approval. A general instruction to integrate all institutions is not an instruction to debit, transfer, trade, withdraw or invest.

## 9. Current blockers

- No verified company legal entity/account ownership and signatory evidence is recorded in this subsystem.
- No personal-account holder consents are recorded.
- Provider API entitlements and production scopes are unverified for Nedbank, Capitec, TymeBank and EasyEquities.
- Wise API OAuth and account scopes are not connected.
- Stripe was previously observed in test mode; production access has not been verified.
- PayPal payout capability must not be assumed from invoice/payment-link or transaction visibility tools.
- No production database, secrets manager, VM or signing/custody service has been verified for this subsystem.

## 10. Acceptance criteria for the read-only stage

- Each provider has a documented official integration route and approved scopes.
- Account ownership boundary is verified and enforced.
- Read-only credentials are isolated from all write credentials.
- Adapter contract tests cover pagination, duplicate events, stale data, timezone handling and provider errors.
- Reconciliation exceptions are visible and auditable.
- No write endpoint is reachable from the read-only runtime.
- No money movement, trading, debit-order initiation or custody action occurs during the read-only stage.

**Completion statement:** This document adds an adapter and governance specification only. It does not connect accounts, authenticate users, provision infrastructure or move funds.
