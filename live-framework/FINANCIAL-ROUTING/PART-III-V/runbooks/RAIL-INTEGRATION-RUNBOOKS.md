# Rail integration runbooks — controlled onboarding

All provider-specific details below are **verification tasks**, not assertions of current API availability, auth requirements, transaction limits, or service-level commitments. Obtain current official documentation and signed commercial onboarding materials before implementation.

## Common adapter lifecycle

1. Register provider, legal entity, jurisdiction, environment and named owner.
2. Obtain provider-approved sandbox access through an authorized administrator.
3. Record exact API version, base URL, auth scheme, scopes, rate limits, idempotency semantics, webhook signature scheme, status semantics and retention.
4. Implement `validate`, `screen`, `authorize`, `send`, `status`, supported `cancel/recall`, `webhook` and `reconcile` behind a common interface.
5. Inject short-lived credentials into the connector from a vault/workload identity; never expose secrets to the model or logs.
6. Bind every request to an immutable intent hash, decision ID, approval token, active policy version and idempotency key.
7. Verify signatures before parsing webhook bodies; deduplicate provider event IDs and enforce legal state transitions.
8. Treat timeout/ambiguous response as UNKNOWN; status-query only, no blind resend.
9. Complete the offline and provider sandbox certification matrix; sign and retain evidence.
10. Keep live send/withdrawal disabled until separate finance, risk, security and production approvals.

## South African bank profiles

### Nedbank
- Confirm corporate product eligibility, host-to-host/API availability, onboarding, supported payment types, statement formats, certificate lifecycle, signing, idempotency and status enquiry.
- Confirm beneficiary validation and callback verification process.
- Test payment submission acknowledgement separately from bank acceptance, processing and settlement.
- Test cut-off calendars, returned/rejected files and statement reconciliation.
- Never infer an API endpoint or OAuth/mTLS combination from this generic profile.

### Capitec / Capitec Business
- Confirm whether the intended legal entity is eligible for business API, host-to-host or file services.
- Obtain exact bulk-payment and payroll file specifications, signing requirements, batch limits and response/return files.
- Add payroll variance and beneficiary-set controls if payroll is in scope.
- Test duplicate batch hashes, partial acceptance and cutoff behavior.

### TymeBank
- Confirm partner integration eligibility and supported business payment/statement capabilities.
- Verify auth, scopes, transaction state model, limits and reconciliation format from partner documentation.
- Throttle and queue on provider rate limits; no silent rail fallback.

### Equal
- Confirm exact contracting entity/product and whether collection, debit-order, payout and reconciliation APIs are available.
- Validate mandate evidence, revocation timing, return codes, signature scheme and settlement reports.
- A revoked mandate is a hard stop for further collections.

## Crypto and wallet profiles

### VALR, Luno and Coinbase
- Verify exact account product, jurisdiction, API version, key scopes, IP allowlisting, withdrawal allowlisting, webhook signing and status APIs.
- Separate read, trade and withdrawal identities. Withdrawal capability remains disabled in this project.
- Bind asset to network; validate full normalized destination and required memo/tag.
- Screen addresses and counterparties using an independently approved provider; missing/indeterminate screening blocks.
- Track exchange ledger and on-chain transaction separately; require chain-specific finality policy.
- No leverage, autonomous withdrawal or blind rebroadcast.

### OneKey and Trust Wallet
- Preparation only: unsigned transaction construction and human-readable transaction preview.
- Private keys and seed phrases never enter AI context, logs, source control or the server.
- Human signs on-device; this runtime must not sign or broadcast.

### MoonPay
- Verify product availability, geography, KYC responsibility, quote expiry, fee disclosure, webhook signature and fiat/crypto settlement references.
- Off-ramp remains disabled until separate approval and beneficiary controls are certified.

## Global payment services

### PayPal
- Verify business account eligibility, OAuth scopes, payout recipient controls, account limitation semantics, webhook verification, reports and refund/dispute states.
- Compliance hold/account limitation blocks further sends and triggers human escalation.

### Wise
- Verify account/API eligibility, token scopes, quote expiry, recipient validation, transfer status semantics, statements, corridor/currency availability and compliance holds.
- Expired quotes require a fresh quote; compliance holds are not retryable.

## Rail-specific evidence to capture

- Official specification URL, retrieval date and document/version hash.
- Provider sandbox account/entity and permitted test scope (no secrets in evidence).
- Test-case ID, input fixture hash, expected result, actual result and timestamps.
- Request correlation ID, provider reference (redacted/tokenized), webhook event ID and state transitions.
- Ledger/reconciliation evidence and exception outcome.
- Independent reviewer, approver and evidence integrity hash.

A provider is not “connected” merely because it appears in the inventory or a plugin catalog. Use explicit lifecycle states: not_configured, sandbox_configured, sandbox_verified, production_pending_approval, production_verified, revoked, unknown.
