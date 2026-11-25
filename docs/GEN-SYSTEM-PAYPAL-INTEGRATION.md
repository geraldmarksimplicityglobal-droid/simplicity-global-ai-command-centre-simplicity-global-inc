# GEN SYSTEM — PayPal Integration

**System object:** SG-PAYPAL-001  
**State:** Mock-only reference implementation  
**Scope:** AI Command Centre, Marketplace API, Partner Center  
**Default mode:** MOCK  
**Live mode:** Disabled

## Architecture

- **Marketplace:** `internal/paypal` exposes mock-only HTTP views for status, invoices, transactions, disputes, payment links, and local reference reconciliation.
- **Partner Center:** `src/paypal-mock.js` exposes isolated invoice, transaction, dispute, and payment-link fixtures, local reference reconciliation, and webhook fail-closed status.
- **Command Centre:** This document is the integration control specification and evidence index.

## Supported read-only operations\n\nMarketplace API mock routes (all return `mode: mock`, `Cache-Control: no-store`, and reject non-GET methods):\n\n- `GET /api/v1/paypal/status`\n- `GET /api/v1/paypal/invoices`\n- `GET /api/v1/paypal/transactions`\n- `GET /api/v1/paypal/disputes`\n- `GET /api/v1/paypal/payment-links` (empty fixture; creation disabled)\n- `GET /api/v1/paypal/reconciliation` (reference counts only; explicitly not financial reconciliation)\n

| Operation | Mock behavior |
|---|---|
| List invoices | One local draft fixture, USD 0.00 |
| List transactions | Empty local fixture |
| List disputes | Empty local fixture |
| List payment links | Empty local fixture |
| Reconciliation | Compare imported/exported references only; no bank writes |

## Explicitly blocked operations

Invoice dispatch, payment-link creation, checkout capture, authorization, refund, payout, transfer, account changes, live API calls, webhook registration, and deployment are not implemented or enabled. Mock webhook verification explicitly fails closed; local reference matching is not settlement verification.

## Live integration prerequisites (not performed)

1. Confirm the PayPal account owner, business profile, supported country/currency, and account capability in PayPal.
2. Review the official PayPal REST API product requirements and applicable South African availability.
3. Obtain separate scoped authorization for a sandbox connection; live credentials must never be committed or printed.
4. Implement OAuth token handling in a secret manager, least-privilege access, timeouts, bounded retries, and redacted structured logs.
5. Verify webhook signatures against PayPal's verification endpoint before accepting events. Enforce event-ID idempotency and retain verification evidence. Current mock adapter blocks webhook registration and live webhook acceptance; no listener exists.
6. Use decimal-safe monetary values and explicit ISO-4217 currencies. Never use binary floating-point for amounts.
7. Reconcile PayPal transaction IDs against invoice/order references; never infer settlement from browser redirects.
8. Add contract tests, sandbox integration tests, security review, operator approval, and rollback plan before any live cutover.

## Control gates

- Inspect first; preserve existing files and records.
- Mock mode is the default and must remain usable without network access or credentials.
- Fail closed when mode is unknown, credentials are absent, webhook verification fails, or an idempotency key is missing.
- Human operator review is required for every protected financial or account action.
- No legal, tax, banking, payout, or payment action is delegated to this integration.

## Evidence

- Marketplace package: `internal/paypal/mock.go`, `internal/paypal/modules.go`, `internal/paypal/http.go`, and package tests
- Partner Center adapter: `src/paypal-mock.js`, `tests/paypal-mock.test.js`\n- Partner Center reference reconciliation compares opaque references only; it does not assert settlement or move funds.
- Test entrypoint: Partner Center `npm test`
- CI status must be checked on the pull request before merge.
