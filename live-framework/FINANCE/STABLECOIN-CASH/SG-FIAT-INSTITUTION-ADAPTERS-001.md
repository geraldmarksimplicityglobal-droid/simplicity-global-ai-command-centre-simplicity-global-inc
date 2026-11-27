# SG-FIAT-INSTITUTION-ADAPTERS-001 — Multi-institution treasury integration

**Status:** Implementation specification; provider access not authenticated  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Parent:** `SG-STABLECOIN-CASH-001`  
**Operating mode:** Read-only first; execution disabled  
**Scope:** Nedbank, Capitec, TymeBank, Wise and EasyEquities

## 1. Objective

Define one adapter boundary for five financial institutions while preserving separate ownership, legal-entity, currency, account and asset boundaries. Support both company-owned accounts and individually owned accounts only where the relevant account holder has explicitly authorised the connection.

This specification does not assert that any institution has approved Simplicity Global for API access. No provider credentials, account identifiers, personal information, mandates or secrets belong in this repository.

## 2. Institution registry

| Institution | Domain | Initial capability target | Verification state |
|---|---|---|---|
| Nedbank | Banking | Account identity, balances, statements, transaction history; payment preparation only if entitled | API product, legal entity eligibility, scopes and production access must be confirmed |
| Capitec | Banking | Account identity and available transaction-data route; payment initiation only if supported for the exact account/product | Business-account data access and API entitlement unverified |
| TymeBank | Banking | Account identity, balances and statements through an approved provider route | Direct API or approved aggregator route unverified |
| Wise | Multi-currency banking / transfers | Profiles, balances, statements, FX quotes and transfer preparation within granted scopes | API access, account type, regional eligibility and production scopes must be confirmed |
| EasyEquities | Investment platform | Portfolio positions, cash balances, valuations, transactions and statements where an authorised data interface exists | Public/partner API entitlement and supported account-data scopes unverified |

EasyEquities is an investment-data source, not a bank payment rail. Investment holdings, unsettled proceeds and withdrawable cash must remain distinct.

## 3. Ownership and legal-entity isolation

Every linked account must be assigned exactly one ownership class:
- `COMPANY`: verified legal entity owns the account and the connecting user has delegated authority.
- `INDIVIDUAL`: named account holder has authorised access and the data is segregated from company books unless a separately documented lawful transaction supports a company posting.
- `OTHER_ENTITY`: separately verified entity and authority; never silently mapped to the company.

Every account record must include:
- institution and provider connection identifier;
- ownership class and verified legal-entity/person reference;
- account type and base currency;
- connection consent/authority evidence reference, grant date and expiry/revocation state;
- granted scopes and read/write capability flags;
- verification source, timestamp and status;
- data freshness and last successful sync;
- tenant/entity access policy.

Do not store excess personal data. Use provider-issued opaque identifiers where possible. Do not copy personal account activity into company accounting by default. No cross-ownership transfers or netting.

## 4. Common adapter contract

Each provider adapter must implement the same typed boundary while retaining provider-specific semantics:

- `healthCheck()`: connectivity and provider status; never disclose secrets.
- `getAuthorisedProfile()`: identify the authorised profile/account owner where the provider supports it.
- `listAccounts()`: return only accounts covered by current consent and scopes.
- `getBalances(accountId)`: include currency, available/ledger balance distinction and observation time.
- `getTransactions(accountId, cursor, from, to)`: cursor-based, idempotent transaction ingestion with pending/posted/reversed states.
- `getStatements(accountId, period)`: fetch statement evidence where available.
- `getCapabilities()`: declare read, payment-preparation, payment-submission, FX and webhook support per account/product.
- `verifyWebhook(request)`: validate provider signature, timestamp and replay protection where supported.

Optional write methods must be separate interfaces, disabled by default:
- `prepareTransfer(request)`
- `submitApprovedTransfer(approvedRequest)`
- `cancelTransfer(providerReference)`

No generic adapter method may imply that all providers support the same operations. A missing capability must return an explicit unsupported result, not a simulated success.

## 5. Canonical data and ledger rules

- Store money as integer minor units or exact decimal strings, never binary floating point.
- Preserve provider transaction IDs, account IDs, source timestamps, booking/value dates, original descriptions, currency, fees and status.
- Use institution + account + provider transaction ID as an idempotency identity, with documented handling for providers whose IDs can change.
- Retain raw provider payloads only when necessary, encrypted, access-controlled and subject to retention rules; otherwise store normalized fields and evidence hashes.
- Distinguish available, ledger, pending, blocked, invested, unsettled and withdrawable balances.
- Use explicit FX conversion records with rate, source, timestamp, fee and quote ID.
- Reversals and corrections create compensating ledger entries; never silently overwrite posted journal entries.
- Reconcile each institution and ownership class independently before consolidated reporting.

## 6. Permission and execution model

Default permission is read-only. Provider consent is not payment authority. Account visibility is not authority to debit or transfer.

| Level | Allowed behaviour |
|---|---|
| A0 Observe | Health, account metadata, balances, transactions and statements within granted scopes |
| A1 Reconcile | Match provider records to the appropriate segregated ledger |
| A2 Prepare | Build a transfer/debit proposal with beneficiary, purpose, amount, currency, limits and evidence |
| A3 Submit | Disabled until provider entitlement, legal authority, user approval, beneficiary verification and production gates pass |
| A4 Bounded recurring execution | Disabled until explicit mandate, provider scheme support, bounded policy and separately approved go-live |
| A5 Unbounded discretionary movement | Prohibited |

A provider OAuth grant or API key never grants authority over an account that the authenticated user does not own or administer.

## 7. Security requirements

- OAuth or provider-supported service credentials with least-privilege scopes.
- Secrets only in a managed secrets store; never in Git, chat, logs, screenshots or application config committed to source control.
- Rotate any credential that has previously been exposed.
- Separate sandbox and production credentials, queues, databases and webhook endpoints.
- Encrypt data in transit and at rest; redact logs.
- Verify webhook signatures and prevent replay.
- Enforce entity-level access controls and test cross-entity denial.
- Record consent, scope changes, token refresh/revocation and every access or write attempt in an append-only audit trail.
- Never request passwords, OTPs, card PINs, seed phrases or private keys in chat.

## 8. Rollout and acceptance criteria

### Stage 1 — Provider discovery
For each institution, confirm the legal account product, API/aggregator route, onboarding requirements, data scopes, consent model, regional eligibility, rate limits, webhook semantics and production approval process.

### Stage 2 — Read-only adapter
Implement one adapter at a time with mocked provider fixtures and contract tests. No live credentials in CI. A live connection is marked connected only after an authorised OAuth/API setup and a successful account identity plus read-only health check.

### Stage 3 — Reconciliation
Validate pagination, duplicate handling, pending-to-posted transitions, reversals, statement completeness, time zones, currencies and ownership isolation against provider statements.

### Stage 4 — Payment preparation
Prepare proposals only. Do not submit. Validate beneficiary, amount, currency, business purpose, account ownership, mandate/authority, expiry, policy version and approval digest.

### Stage 5 — Controlled production submission
A separate release record must identify the provider, exact legal entity/account, currency, beneficiaries, limits, approvers, effective date, provider entitlement and permitted autonomy level. A general request to enable everything is not a substitute for provider- and account-specific evidence.

Acceptance requires:
1. All five institutions represented in the registry.
2. Company and individual ownership isolation tests pass.
3. Unsupported capabilities are explicit and fail closed.
4. Duplicate ingestion and webhook replay tests pass.
5. Balance and transaction reconciliation evidence is retained.
6. Read-only roles cannot call write interfaces.
7. No production financial execution is enabled by this specification.

## 9. Current state

This is an implementation specification only. No Nedbank, Capitec, TymeBank, Wise or EasyEquities account is authenticated by this file. No provider connection, account import, payment, debit order, investment trade, withdrawal, wallet signing or VM provisioning is performed by committing it.
