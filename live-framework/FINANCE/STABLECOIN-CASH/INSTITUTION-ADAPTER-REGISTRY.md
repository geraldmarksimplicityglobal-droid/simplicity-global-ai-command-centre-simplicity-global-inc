# SG-BANKING-ADAPTERS-001 — Institution Integration Registry

**Parent system:** `SG-STABLECOIN-CASH-001`  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Status:** Integration specification; provider onboarding and account authorisation pending  
**Mode:** Read-only-first; no live financial execution

## 1. Scope

This registry covers the five institutions requested for the Simplicity Global treasury programme:

1. Nedbank
2. Capitec
3. TymeBank
4. Wise
5. EasyEquities

It supports company-owned accounts and separately authorised personal accounts. The existence of a connection, login, statement or account does not establish that its funds belong to Simplicity Global.

## 2. Ownership and ledger boundaries

Every connected resource must be assigned exactly one ownership class before ingestion:

- `COMPANY`: account legally held by the named company/legal entity, verified against provider evidence.
- `PERSONAL`: account held by an individual. Requires that account holder's informed authorisation and a documented lawful purpose.
- `THIRD_PARTY`: any other person's or entity's account; excluded unless a separately reviewed mandate and legal basis authorise a narrowly scoped integration.

Company and personal resources use separate entity IDs, ledger books, access policies, reporting scopes and retention controls. Personal assets must never be booked as company cash merely because the same operator can view them. Transfers between company and personal resources are not inferred or automatically initiated; they require a separately evidenced legal basis, purpose, beneficiary validation and approval.

Investment holdings, unsettled proceeds, restricted retirement assets and invested Wise balances are not available bank cash. Show them in distinct liquidity and valuation categories.

## 3. Institution adapter registry

| Institution | Documented integration route | Initial scope | Current status / limitation |
|---|---|---|---|
| Nedbank | API Marketplace; OAuth 2.0 authorisation and consent/subscription controls. Accounts, payments, Business Transactions and Account Verification Services are listed. Business Transactions API documentation describes balances, account details, transaction details and statements; certificate prerequisites apply to the B2B interface. | Apply for approved sandbox access; implement consented account/statement ingestion and reconciliation first. | Public API catalogue verified. No Simplicity Global subscription, client credentials, bank consent, certificate or account connection verified. Access is subject to bank onboarding and API product terms. |
| Capitec | Capitec Pay / Open Banking payment-initiation API. Customer selects an account and authenticates/authorises the payment in the Capitec app. | Treat as a customer-authorised payment-initiation rail where Capitec approves the merchant/provider onboarding. Reconcile resulting settlement through the receiving bank/provider. | Official public material verifies payment initiation, not unrestricted business-account aggregation or a general statement API. Do not represent this as a bank-account data API. |
| TymeBank | No public developer API or generally available business-account data interface verified in this research pass. | Adapter interface reserved; use only a bank-approved API, regulated open-banking intermediary or provider-supplied statement export after verification. | Pending direct provider confirmation. No scraping, browser credential automation, password sharing or undocumented endpoints. |
| Wise | Wise Platform API documents profiles, multi-currency balances, balance statements, account details, quotes, recipients, transfers and webhooks. API access requires valid credentials and account/partnership eligibility. Personal API tokens have limited endpoint access; the documentation states balance-statement API limitations for several regions, including South Africa. | Begin with eligible balance/statement visibility and transaction reconciliation. Keep transfer creation/funding disabled until business-profile permissions, account region, endpoint eligibility and approvals are verified. | API documentation verified; no Wise profile, API credentials, partnership entitlement or account connection verified. Do not assume every API endpoint is available to a South African profile. |
| EasyEquities | Official account/help material confirms multiple account types/currencies and access to statements and transaction history through the platform. No public general-purpose portfolio API for this integration was verified. | Separate investment subledger; ingest provider-issued statements/exports through a documented, consented channel. Track account type, currency, cash, holdings, unsettled trades, fees, valuation timestamp and restrictions. | Account features verified; API access remains unverified. No scraping, reverse-engineered endpoints or automated trading. Company/legal-entity eligibility must be checked with the provider. |

## 4. Common adapter contract

Each institution adapter implements the following provider-neutral operations. Unsupported methods must return `NOT_SUPPORTED`; they must not be emulated through undocumented interfaces.

- `health_check()`
- `list_authorised_accounts()`
- `get_account_metadata(account_id)`
- `get_balances(account_id, as_of)`
- `get_statement(account_id, period)`
- `get_transactions(account_id, period, cursor)`
- `verify_beneficiary(details)` where officially supported
- `get_payment_status(provider_reference)` where officially supported
- `prepare_payment(request)` only after an approved capability is configured
- `submit_payment(approved_request)` remains disabled until production gates pass

Every response records provider, environment, account ownership class, consent/authority reference, retrieval timestamp, source cursor/reference, currency, provider status and evidence hash. Secrets are referenced by secret-manager key name only; never store credentials in this repository.

## 5. Data model extensions (proposal only; no migration applied)

- `financial_institutions`
- `institution_connections`
- `institution_capabilities`
- `authorised_account_resources`
- `account_ownership_evidence`
- `provider_consents`
- `provider_credentials_metadata` (secret references only)
- `provider_sync_cursors`
- `provider_statements`
- `provider_transactions`
- `investment_positions`
- `investment_valuations`
- `institution_webhook_events`

Required controls: tenant/entity RLS; encrypted sensitive fields; least-privilege access; append-only audit; data minimisation; retention schedules; revocable consent; provider webhook signature verification; idempotent ingestion; and explicit separation of company, personal and third-party data.

## 6. Reconciliation rules

1. Preserve original provider amount, currency, timestamp, reference and status.
2. Store money as integer minor units or exact decimal strings; never binary floating point.
3. Do not combine unlike currencies without an explicit FX observation and clearing entry.
4. Do not equate a payment request accepted by a provider with settlement.
5. Do not treat investment market value as cash or guarantee that holdings can be liquidated immediately.
6. Keep pending, booked, settled, reversed, returned, disputed and failed states distinct.
7. Unmatched or ambiguous records remain exceptions; they are not silently auto-cleared.
8. Duplicate ingestion is prevented with provider transaction IDs or stable composite idempotency keys.

## 7. Execution boundary

All institution adapters start in `OBSERVE` mode. The programme may progress through:

- A0 Observe: authorised balances, statements, transactions and connection health.
- A1 Reconcile: match provider records against the ledger and report exceptions.
- A2 Prepare: prepare a payment or debit-order proposal with evidence and canonical digest.
- A3 Submit: only after provider capability, legal authority, mandate, limits, dual approval and explicit per-instruction authorisation are verified.
- A4 Bounded recurring execution: separately reviewed, scheme-specific mandate, allowlist, limits, revocation and kill-switch controls.
- A5 Unbounded discretionary movement: prohibited.

No bank transfer, debit order, Wise transfer, investment order, stablecoin transfer, token approval or withdrawal is enabled by this registry.

## 8. Provider onboarding checklist

For each institution and each company/personal profile separately:

- Confirm account holder and legal ownership class.
- Obtain the provider's current API/partner documentation and written eligibility confirmation.
- Register the application through the provider's official portal.
- Obtain sandbox credentials and test consent/authentication.
- Verify scopes, account-region restrictions, data permissions, rate limits, webhook signing and API terms.
- Complete security/privacy impact assessment and applicable South African legal/compliance review.
- Validate statement/transaction completeness and reconciliation against provider-issued records.
- Store credentials in an approved secrets manager; rotate any credentials previously exposed in chat or files.
- Obtain explicit approval before production credentials, paid infrastructure, live payment permissions or financial execution are enabled.

## 9. Research references

Official provider documentation reviewed for this registry:

- Nedbank API Marketplace: https://apim.nedbank.co.za/
- Nedbank Business Transactions API prerequisites: https://apim.nedbank.co.za/static/docs/accounts-b2b-prerequisites
- Capitec Pay: https://www.capitecbank.co.za/personal/transact/capitec-pay-payment-provider/
- Wise API reference: https://docs.wise.com/api-reference
- Wise API guides and eligibility: https://docs.wise.com/guides
- Wise personal API token limitations: https://docs.wise.com/guides/developer/auth-and-security/personal-api-token
- EasyEquities accounts and currencies: https://www.easyequities.co.za/accounts
- EasyEquities profile, statements and transaction history help: https://support.easyequities.co.za/support/solutions/articles/13000097356-how-do-i-access-my-full-easyequities-profile-

TymeBank and EasyEquities public API access remain unverified. Recheck official provider channels during onboarding; absence of a public API listing is not proof that a private partner interface does not exist.

## 10. Acceptance criteria

The adapter programme is ready for a read-only pilot only when each institution's approved interface, account owner, consent, credentials, permitted scopes, source completeness, reconciliation tests and audit evidence are verified. Production payment capability remains a separate release decision and is not implied by passing read-only tests.
