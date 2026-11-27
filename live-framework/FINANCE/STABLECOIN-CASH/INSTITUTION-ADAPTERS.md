# SG-TREASURY-INSTITUTIONS-001 — Multi-institution adapter specification

**Parent system:** `SG-STABLECOIN-CASH-001`  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Status:** Implementation specification; provider connections not authenticated  
**Default posture:** Read-only; all financial execution disabled

## 1. Scope

Provide one adapter contract for the following institution categories:

| Institution | Adapter ID | Classification | Initial permitted scope |
|---|---|---|---|
| Nedbank | `nedbank` | Bank | Account identity, balances, statements and transaction status, only where approved API entitlements exist |
| Capitec | `capitec` | Bank | Account identity and supported account/payment information, subject to the specific Capitec product and consent route |
| TymeBank | `tymebank` | Bank | Account and transaction visibility through an approved provider interface; do not assume a public API |
| Wise | `wise` | Multi-currency financial institution | Profile, balances, statements, FX quotes and transfer status where the account and API permissions support them |
| EasyEquities | `easyequities` | Investment platform | Portfolio positions, investment cash, valuations and activity through an authorised data route; no trading |

The registry does not assert that an API, business product, account-data permission, payout permission or developer agreement is available for every institution. Each capability remains `unverified` until supported by current provider documentation and an authenticated read-only test.

## 2. Account ownership and segregation

Every linked account must have exactly one ownership classification:

- `company`: account legally held by the verified Simplicity Global legal entity.
- `individual`: account held by an identified natural person who has authorised the connection.
- `third_party`: customer, supplier, investor or other external account; never treated as company liquidity.
- `investment`: brokerage or investment account; holdings are not bank cash.

Required account metadata:

- internal account UUID (never use an account number as the primary key);
- institution and provider account reference (encrypted/tokenised where possible);
- ownership class and verified legal owner reference;
- legal entity ID or individual consent record;
- base currency and supported currency balances;
- connection permission scope and consent expiry;
- evidence reference, verification date and reviewer;
- account status, last successful sync and data freshness.

An individual account must not be consolidated into company available cash. Company and personal records must be separately permissioned and separately reported. Transfers between ownership classes require a separately recorded legal basis, verified beneficiary, accounting treatment and explicit transaction approval.

## 3. Common adapter contract

Each provider adapter must implement these logical operations, with unsupported operations returning an explicit `capability_not_supported` result:

1. `healthCheck()` — confirm token validity and granted scopes without exposing credentials.
2. `listAuthorisedAccounts()` — return only accounts accessible under the authenticated consent.
3. `getAccount(accountRef)` — return masked identity and ownership metadata.
4. `getBalances(accountRef)` — return currency, amount, timestamp and pending/available distinction.
5. `listTransactions(accountRef, cursor, from, to)` — return stable external IDs, booking/value dates, currency, signed amount, status and redacted counterparty metadata.
6. `getStatement(accountRef, period)` — fetch provider-issued statement evidence where supported.
7. `getTransferStatus(transferRef)` — status only; no transfer creation in the read-only adapter.
8. `revokeConnection()` — revoke provider consent or mark manual revocation required if the provider has no API for it.

Write operations are not part of the read-only adapter contract. If later added, they must be implemented in a separate execution adapter with a separate credential, permission scope, policy engine, approval digest and independent release gate.

## 4. Institution-specific capability registry

### Nedbank
- Initial mode: `pending_provider_onboarding`.
- Verify the exact product (personal/business), API catalogue entry, account-data scope, payment scope, OAuth/client authentication, production onboarding, certification and commercial terms.
- Do not assume an account-data API or payment-initiation permission follows from access to the API marketplace.
- Payment initiation remains disabled.

### Capitec
- Initial mode: `pending_product_and_consent_verification`.
- Establish whether the relevant account is personal or business and identify the applicable Open Banking/payment-initiation product.
- Confirm whether balance and transaction retrieval is available for the exact account class; payment initiation is a separate scope.
- Payment initiation remains disabled.

### TymeBank
- Initial mode: `pending_provider_route_verification`.
- No public developer API is assumed by this specification.
- Investigate a bank-approved API, regulated account-information provider, or user-authorised statement import. Treat manual statement imports as evidence with provenance, not a live connection.
- Payment initiation remains disabled.

### Wise
- Initial mode: `pending_authorised_api_connection`.
- Verify Wise Business versus personal profile, supported API scopes, profile ownership, balance and statement access, currency coverage, transfer permissions, recipient controls, and production API requirements.
- FX quote retrieval and transfer status are informational capabilities; quote creation or transfer execution requires separate approval.
- Transfer creation remains disabled.

### EasyEquities
- Initial mode: `pending_authorised_data_route`.
- Classify as investment custody/reporting, not as a bank payment rail.
- Verify whether an official API, authorised data export or statement route is available for the account.
- Record securities, units, valuation timestamp, investment cash, fees, dividends and corporate actions separately.
- Trading, withdrawals, deposits and portfolio rebalancing remain disabled.

## 5. Canonical ledger boundaries

Use separate subledgers for:
- company bank cash;
- individual bank cash (one owner per ledger partition);
- Wise balances by profile, owner and currency;
- investment positions and brokerage cash;
- customer/third-party funds (if legally held, in a separately governed ledger);
- stablecoin positions by chain ID and verified token contract.

Never sum brokerage holdings, pending transfers, stablecoins, personal funds or customer funds into company available bank cash. Consolidated reporting may show them in distinct categories with explicit valuation timestamps and availability labels.

All amounts use integer minor units or exact decimal strings. Store ISO currency codes. Preserve original provider transaction IDs and source timestamps. Deduplicate with provider + account reference + external transaction ID; retain reversals and corrections as compensating entries.

## 6. Data security and privacy

- Use OAuth or provider-issued service credentials with least privilege.
- Store secrets only in an approved secrets manager; never in source control, chat, logs, local plaintext config or test fixtures.
- Encrypt account references and sensitive counterparty fields at rest and in transit.
- Mask account numbers and personal identifiers in dashboards and logs.
- Record the consent purpose, data categories, owner, grant time, expiry and revocation.
- Enforce owner- and legal-entity-scoped access controls and test cross-owner isolation.
- Apply POPIA and other applicable privacy requirements, including retention, access, correction, deletion and incident handling.
- A connection must stop syncing when consent is revoked or expires.

## 7. Reconciliation and freshness

Each imported record retains provider, account, source ID, source timestamp, ingestion timestamp, currency, amount, status and evidence hash. Reconciliation matches source records to the canonical ledger without silently changing posted entries.

A provider outage, stale balance, missing statement period, duplicate, currency mismatch, ambiguous transaction status or ownership mismatch creates an exception and blocks automated close. API acceptance is never equivalent to settlement. Investment valuation is never equivalent to withdrawable cash.

## 8. Release gates per institution

No provider is promoted from pending to connected until all relevant evidence exists:

1. Owner and account class verified.
2. Account holder consent and/or company authority verified.
3. Official provider route and API documentation reviewed.
4. Required production access and data scopes approved by provider.
5. Secrets stored in approved vault and least-privilege scope tested.
6. Read-only health check and account identity verification pass.
7. Statement completeness and transaction pagination tested.
8. Reconciliation, duplicate handling and stale-data tests pass.
9. Privacy, retention and access-control review completed.
10. Named owner approves the institution-specific release record.

Financial write permissions require a separate change request and approval. Connecting a read-only feed does not authorise payments, debit orders, trading, withdrawals, stablecoin transfers or movement between personal and company accounts.

## 9. Initial status manifest

All institutions begin as `not_connected`; no provider credential or live account identity is presumed.

```json
{
  "system_id": "SG-STABLECOIN-CASH-001",
  "extension_id": "SG-TREASURY-INSTITUTIONS-001",
  "environment": "design",
  "default_mode": "read_only",
  "financial_execution_enabled": false,
  "debit_order_submission_enabled": false,
  "trading_enabled": false,
  "stablecoin_signing_enabled": false,
  "institutions": {
    "nedbank": {"status": "not_connected", "mode": "read_only"},
    "capitec": {"status": "not_connected", "mode": "read_only"},
    "tymebank": {"status": "not_connected", "mode": "read_only"},
    "wise": {"status": "not_connected", "mode": "read_only"},
    "easyequities": {"status": "not_connected", "mode": "investment_reporting_only"}
  },
  "ownership_classes": ["company", "individual", "third_party", "investment"]
}
```

## 10. Acceptance criteria for the first implementation increment

- A provider registry represents all five institutions without claiming any are connected.
- Company and individual ownership classes cannot be mixed in ledger queries or reports.
- Unsupported provider capabilities fail closed with an explicit status.
- No write endpoint is exposed by read-only adapters.
- All provider data is traceable to source and timestamp.
- Tests cover duplicate ingestion, stale data, consent expiry/revocation, owner isolation, currency precision and unsupported capabilities.
- No production credentials, account numbers, personal identifiers or secrets are committed.
