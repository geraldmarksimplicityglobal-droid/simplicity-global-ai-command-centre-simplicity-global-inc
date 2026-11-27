# SG-STABLECOIN-CASH-001 — Institution Adapter Registry

**Status:** Design increment; provider access and production execution not enabled  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Scope:** Nedbank, Capitec, TymeBank, Wise and EasyEquities

## 1. Operating boundary

This registry defines a common integration contract. It does not assert that any institution has approved API access, that any account is connected, or that Simplicity Global is authorised to initiate payments or provide regulated financial services.

Treat each connection as a separately authorised data source. Company accounts, individually owned accounts, investment assets, customer funds and third-party payer funds must never be pooled or treated as interchangeable.

Every account record must carry:
- institution and provider product;
- account owner type: legal entity, individual, customer/third party, or investment account;
- verified legal owner reference and evidence reference (do not store identity documents in ordinary logs);
- legal entity / tenant scope;
- account identifier tokenised or masked for display;
- currency, account type and permitted capabilities;
- consent/mandate reference, scopes, expiry and revocation state;
- provider connection status and last successful health check.

Unknown ownership, missing consent, ambiguous authority or expired credentials means read access is denied and all execution remains disabled.

## 2. Institution adapter register

| Adapter ID | Institution | Initial scope | Execution posture |
|---|---|---|---|
| `nedbank` | Nedbank | Discover approved business/open-banking products; account metadata, balances, statements and transaction feeds where contractually available | Read-only first; payment initiation separately gated |
| `capitec` | Capitec | Verify applicable business-account and consent-based data access products; do not infer data access from payment-initiation availability | Read-only only after product and entitlement verification |
| `tymebank` | TymeBank | Verify bank-approved API, partner or consent-based access route; otherwise support controlled statement import | No direct API assumption; no execution |
| `wise` | Wise | Approved profile/account access, balances, statements, transfers and FX records within granted API scopes | Read-only first; transfer preparation and submission separately gated |
| `easyequities` | EasyEquities | Approved portfolio, holdings, cash balance, valuation and activity reporting if an authorised interface exists | Investment reporting only; never a bank-payment rail |

An unsupported or unavailable API must be labelled `manual_import` or `not_available`, not simulated as connected. Do not scrape authenticated portals or automate credential/OTP entry as a substitute for approved provider access.

## 3. Common adapter contract

Each adapter should implement these capabilities independently and report unsupported methods explicitly:

- `health_check()`
- `list_authorised_accounts()`
- `get_account_metadata(account_ref)`
- `get_balances(account_ref, as_of)`
- `list_transactions(account_ref, from, to, cursor)`
- `get_statement(account_ref, period)`
- `get_fx_observations(base, quote, as_of)` (where supported)
- `prepare_transfer(request)` (optional; never submits)
- `submit_transfer(approved_request)` (disabled until release gates pass)
- `get_transfer_status(provider_reference)`
- `verify_webhook(signature, payload)`

The adapter must declare provider, API version, OAuth scopes, data freshness, pagination behavior, rate limits, idempotency support, webhook signature scheme, supported currencies, supported account types and known limitations. Store provider timestamps and ingestion timestamps separately.

## 4. Canonical ledger mapping

Normalize source data into the existing treasury ledger without erasing provider semantics:

- balances: account, currency, available/ledger balance distinction, as-of timestamp;
- transactions: provider transaction ID, booking/value dates, amount in integer minor units, ISO currency, debit/credit direction, status, counterparty reference, fee, source reference and raw-payload evidence hash;
- FX: base/quote currencies, rate, source, timestamp, fees/spread and quote expiry;
- investments: instrument identifier, quantity, cost basis when supplied, valuation timestamp, cash component and corporate-action/activity reference.

Do not treat EasyEquities portfolio market value as withdrawable cash. Do not treat a Wise balance or pending transfer as settled funds. Do not assume a stablecoin peg or convert an investment valuation into cash without an actual settlement event.

## 5. Data isolation and reconciliation

- Use separate ledgers/subledgers for each legal entity and each individual account owner.
- A personal account may be visible only under the individual owner's explicit consent and must be tagged `personal`; it is not a company treasury asset.
- Inter-account transfers require both source and destination ownership/authority checks and must be represented as linked but separately evidenced transactions.
- Never infer company reimbursement, capital contribution, director loan, salary, dividend or customer-money status from a transfer description. Require an approved accounting classification and supporting evidence.
- Match imported transactions idempotently using institution + account reference + provider transaction ID; where unavailable, use a carefully versioned composite fingerprint and retain collision review.
- Reconcile each provider statement independently. Preserve pending, booked, settled, reversed, returned and disputed states.
- Raw payloads must be encrypted, access-controlled and retained only under an approved retention schedule; logs contain redacted metadata only.

## 6. Consent, credentials and security

- Use provider-supported OAuth, scoped API credentials or approved partner connectivity.
- Keep secrets in an approved secrets manager; never commit credentials, API keys, refresh tokens, bank passwords, PINs, OTPs, private keys or seed phrases.
- Apply least privilege, short-lived tokens where supported, rotation, revocation, access logs and environment separation.
- Verify webhook signatures and replay protection before processing events.
- Separate sandbox and production credentials, databases, queues and callback endpoints.
- Never use personal credentials to establish a company connection or vice versa.

## 7. Execution release gates

No transfer, debit-order initiation, beneficiary creation, withdrawal, investment trade, stablecoin movement or account-setting change may be submitted until all relevant gates pass:

1. verified account owner and legal-entity authority;
2. provider contract and production entitlement for the exact operation;
3. valid mandate/consent and scope;
4. beneficiary and destination verification;
5. purpose, invoice/contract evidence and accounting classification;
6. amount, currency, daily/monthly and counterparty limits;
7. idempotency and duplicate-submission protection;
8. maker/checker approval bound to an immutable request digest;
9. provider-specific authentication and confirmation semantics;
10. compliance/legal review and explicit go-live approval.

A successful API response may mean accepted or queued, not settled. Settlement requires provider/bank evidence and reconciliation.

## 8. Implementation phases

1. **Inventory:** identify accounts, ownership class, product, permissions and evidence without collecting credentials in chat.
2. **Provider verification:** obtain each institution's current API/product documentation and confirm the user's actual account eligibility.
3. **Read-only adapters:** implement health, account metadata, balances and transaction/statement ingestion only where approved.
4. **Shadow reconciliation:** compare imported data with official statements and manually investigate exceptions.
5. **Prepare-only workflows:** produce transfer/debit proposals without submitting them.
6. **Controlled execution:** consider one provider, one legal entity, one currency and strict low limits only after all release gates are documented and separately approved.
7. **Expansion:** add further owners, currencies, institutions and capabilities individually.

## 9. Acceptance criteria

- All five institutions appear in the adapter registry with honest states: connected, pending verification, manual import, unavailable or disabled.
- Company and personal ownership scopes are tested for cross-account isolation.
- No personal account can be posted to a company ledger without an approved accounting classification and evidence.
- Investment value is never counted as bank cash.
- Duplicate imports do not create duplicate postings.
- Stale, incomplete or ambiguous provider data raises an exception.
- Read-only credentials cannot invoke write methods.
- No production payment or investment execution occurs in the test suite.
- Every status displayed in the dashboard is backed by provider evidence and a timestamp.

## 10. Current state

This document is a design and implementation contract only. The repository's existing treasury specification records that no bank, regulated off-ramp, custodian or production payment rail had been verified, no Supabase project was available, and production signing/execution was disabled. This extension does not change those facts. Provider onboarding, account authentication, database provisioning, infrastructure provisioning, legal review and explicit go-live approval remain outstanding.
