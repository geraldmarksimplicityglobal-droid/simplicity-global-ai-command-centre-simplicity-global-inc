# SG-STABLECOIN-CASH-001 — Provider Adapter Registry

**Status:** Integration specification; no provider account is connected by this document  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Execution posture:** Read-only first; payment and investment mutations disabled  
**Scope:** Nedbank, Capitec, TymeBank, Wise and EasyEquities

## 1. Purpose and boundaries

Define a common adapter contract for five financial institutions while preserving distinct account ownership, legal authority, product capabilities and provider-specific consent.

Simplicity Global is the orchestration and accounting layer. It is not a bank, broker, custodian, payment scheme or licensed financial institution merely by virtue of this integration design.

The adapter registry must never infer that:
- a personal account is a company asset;
- a company user is an authorised signatory;
- a bank login grants API consent;
- an account-data permission grants payment-initiation permission;
- an investment portfolio is withdrawable cash;
- a connected read-only API authorises a payment, debit order, trade or withdrawal.

## 2. Provider capability register

| Provider | Evidence-backed capability | Current implementation status | Next verification gate |
|---|---|---|---|
| Nedbank | Official API Marketplace lists OAuth 2.0 authorisation, customer/account APIs, payments, business transactions and account verification. | Adapter contract can be implemented; no Simplicity Global application, subscription, consent or account connection verified. | Register application; obtain current API specifications; subscribe to required APIs; validate business/personal consent and scopes in sandbox. |
| Capitec | Capitec Pay supports a payment-initiation request that the retail customer authorises in the Capitec app. Public evidence reviewed does not establish unrestricted account aggregation or statement API access. | Payment-initiation capability only as a documented candidate; account-data adapter remains unverified. | Obtain partner onboarding, API specification, merchant eligibility, callbacks, test credentials and permitted data scopes. |
| TymeBank | Official TymeBank API-management gateway endpoints are discoverable, but detailed public account-data and payment documentation was not verified in this review. | Discovery pending; no endpoint contract or capability is assumed. | Obtain bank-issued developer/partner documentation, access terms, OAuth/client credentials process, sandbox and supported account products. |
| Wise | Official Wise Platform API documents profile, multi-currency balances, balance statements, quotes, recipients, transfers and webhooks. Personal API token documentation limits available endpoints; statement and funding capabilities are region/account dependent. | API contract can be implemented behind explicit capability flags; no Wise profile or production credentials verified. | Confirm account type, South African eligibility, API access model, token scopes, statement access and transfer/funding permissions. Start with read-only profile/balance/statement access where granted. |
| EasyEquities | Official help material documents portfolio views, account types, statements and transaction-history exports. A public customer portfolio API was not verified. | Statement-import adapter is the supported initial path; API adapter remains pending written provider confirmation. | Ask EasyEquities for approved API/partner access and data-export formats. Do not scrape authenticated pages or automate trading. |

### Provider source references

- Nedbank API Marketplace: https://apim.nedbank.co.za/
- Nedbank API documentation: https://apim.nedbank.co.za/static/docs/start
- Capitec Pay: https://www.capitecbank.co.za/personal/transact/capitec-pay-payment-provider/
- TymeBank API gateway discovery: https://chapigw-mambu.tymebank.co.za/
- Wise API reference: https://docs.wise.com/api-reference
- Wise personal API token limitations: https://docs.wise.com/guides/developer/auth-and-security/personal-api-token
- EasyEquities account and statement guidance: https://support.easyequities.co.za/support/solutions/articles/13000112134-capitec-quick-start-guide

Provider documentation and access conditions must be rechecked during onboarding. A public landing page is not evidence of an approved production integration.

## 3. Common adapter contract

Each provider adapter implements the following logical operations where, and only where, the provider grants the corresponding permission:

### Read operations
- `getConnectionStatus()`
- `getAuthorisedProfiles()`
- `listAccounts()`
- `getBalances(accountRef)`
- `getTransactions(accountRef, dateRange, cursor)`
- `getStatements(accountRef, dateRange, format)`
- `getProviderStatus(externalRef)`

### Preparation operations (disabled until separately approved)
- `validateBeneficiary(input)`
- `quoteTransfer(input)`
- `prepareTransfer(input)`
- `prepareDebitOrder(input)`

### Mutation operations (disabled)
- `submitTransfer(approvedRequest)`
- `submitDebitOrder(approvedRequest)`
- `cancelInstruction(approvedRequest)`
- `submitInvestmentOrder(approvedRequest)`

A provider adapter must advertise an explicit capability manifest. Unsupported operations return `CAPABILITY_NOT_GRANTED`; they must not silently fall back to browser automation, password reuse or another provider's API.

## 4. Ownership and authority model

Every account record must identify one of these ownership classes:

- `COMPANY`: account legally held by the verified corporate entity.
- `INDIVIDUAL`: account held by a verified natural person.
- `THIRD_PARTY`: another person's/entity's account, only where a documented lawful mandate and provider consent permit the specific use.
- `INVESTMENT_CUSTODY`: broker-held assets recorded as investments, not bank cash.

Required account metadata:
- internal account ID;
- provider and provider account reference (tokenised or encrypted);
- ownership class;
- legal owner reference;
- legal entity/person relationship and evidence reference;
- account product and currency;
- provider consent/grant reference and granted scopes;
- data-access purpose;
- connection status and last successful sync;
- verification status and review date.

Never use a bank account number, national ID number, login, password, OTP or access token as a general-purpose internal primary key.

### Separation rules
- Company and individual ledgers remain separate.
- Transfers between company and personal accounts are not automatically intercompany movements or expenses; they require classification, supporting evidence and appropriate approval.
- EasyEquities holdings are recorded in investment subledgers. Only provider-confirmed withdrawable cash may be represented as a cash-equivalent balance, and it remains distinct from settled bank cash.
- Wise currency balances are separate currency accounts. FX conversions create linked debit/credit legs, fees and an explicit rate record.
- No provider is allowed to read another provider's credentials or tokens.

## 5. Permission tiers

| Tier | Meaning | Default |
|---|---|---|
| P0 | No connection; metadata only | Enabled |
| P1 | Provider health and non-sensitive metadata | Disabled until configured |
| P2 | Consented balances, transactions and statements | Requires account-owner/provider consent |
| P3 | Quote and payment/instruction preparation | Requires verified authority and policy approval |
| P4 | Submit an individually approved payment/instruction | Disabled |
| P5 | Bounded recurring execution under a valid mandate | Disabled; separate legal, provider and management approval |
| P6 | Unbounded discretionary financial activity | Prohibited |

Permissions are scoped per provider, profile, account, legal owner, operation and environment. A grant for one personal profile must not be reused for a company profile.

## 6. Canonical transaction and reconciliation model

Normalise provider data without losing the original evidence:
- provider transaction ID and account reference;
- provider status and raw status code;
- booking date, value date and provider timestamp;
- amount as integer minor units or exact decimal string;
- ISO 4217 currency;
- counterparty reference (minimise personal data);
- description/reference;
- fee and FX components;
- source statement/document ID;
- import cursor and ingestion timestamp;
- idempotency key and raw-payload hash.

Store the provider's raw response in a restricted evidence store with encryption, retention rules and redaction. Do not place secrets or unnecessary personal data in application logs.

Reconciliation must distinguish pending, booked, settled, reversed, returned, disputed and failed states. An API acceptance response is not proof of settlement. Duplicate ingestion must be idempotent.

## 7. Security and privacy controls

- Use provider-approved OAuth, consent and token mechanisms; never collect or store bank passwords or OTPs.
- Store credentials only in a managed secrets vault; never in Git, source files, chat, test fixtures or logs.
- Encrypt sensitive data in transit and at rest; use least-privilege service identities and per-provider secret isolation.
- Validate webhook signatures and replay windows.
- Apply tenant and legal-owner access controls at the database layer.
- Record consent purpose, scopes, grant date, expiry/revocation and evidence.
- Provide revocation and disconnection workflows.
- Apply POPIA purpose limitation, data minimisation, access control, retention and data-subject request handling.
- Do not scrape authenticated banking or investment portals or bypass provider controls.

## 8. Rollout and acceptance gates

1. **Inventory:** identify each intended account and its legal owner without collecting credentials in chat.
2. **Authority:** verify company signatories, individual account-owner consent and any third-party mandate.
3. **Provider onboarding:** obtain approved developer/partner access and current specifications.
4. **Sandbox:** implement provider-specific auth, schemas, pagination, error handling and webhook verification using test credentials.
5. **Read-only pilot:** connect one authorised profile at a time; validate balances and statements against provider records.
6. **Reconciliation:** pass duplicate, missing-page, stale-data, FX, reversal and statement-period tests.
7. **Preparation:** enable payment preparation only after verified beneficiary and authority controls pass.
8. **Controlled submission:** requires separate explicit approval, provider permissions, limits, dual control and production release sign-off.
9. **Bounded recurring operation:** only after scheme-specific mandates, notice rules, provider acceptance and independent monitoring are verified.

No production credentials, bank account changes, debit orders, transfers, investments, VM provisioning, database migration or provider account switching are authorised by this specification.

## 9. Acceptance criteria

- Company and personal accounts cannot be merged or cross-read without an explicit, authorised relationship.
- Each provider publishes only capabilities actually granted to that connection.
- Nedbank, Capitec, TymeBank, Wise and EasyEquities can be represented in the same registry without assuming identical APIs.
- Statement imports are traceable to source documents and idempotent.
- EasyEquities investment assets never inflate available operating cash.
- Wise FX legs and fees reconcile to the exact source and destination currencies.
- Read-only service identities cannot call mutation endpoints.
- All mutation endpoints fail closed unless a valid, unexpired approval and provider capability are both present.
- No secrets, passwords, OTPs, private keys or full account identifiers are committed to the repository.

**Release state:** Specification only. No provider adapter is authenticated, no financial account has been connected, and no financial instruction has been submitted.
