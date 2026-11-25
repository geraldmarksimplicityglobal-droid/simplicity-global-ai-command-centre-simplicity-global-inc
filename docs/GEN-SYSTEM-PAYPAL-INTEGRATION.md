# GEN SYSTEM — PayPal + Crypto Asset Integration

**System object:** SG-FINANCIAL-ASSETS-001  
**Parent system:** SG-PAYPAL-001  
**State:** Mock-first architecture extension; live operations disabled  
**Scope:** AI Command Centre, Marketplace API, Partner Center  
**Default mode:** MOCK  
**Primary customer payment route:** PayPal  
**Wallet data:** Read-only public-address inspection only

## System directive

Route supported customer payments through PayPal as the primary fiat payment provider. Treat crypto wallets and exchanges as asset-information sources for portfolio inventory, valuation, transaction visibility, and reconciliation references. Do not assume crypto deposits can be routed into PayPal or automatically converted to fiat. Any crypto-to-fiat conversion, custody, transfer, or settlement path requires a separately verified provider capability, country/currency eligibility review, and explicit authorization.

## Payment routing

Customer -> Simplicity Global payment gateway -> PayPal checkout/payment flow -> PayPal transaction status -> internal financial ledger -> reconciliation and audit evidence.

- PayPal is the designated primary customer payment destination in this architecture.
- The application records PayPal order/invoice/payment references and verified provider status.
- A browser redirect or client-side success message is never proof of settlement.
- Payment confirmation must come from a verified PayPal server-side event or authoritative read-only transaction query.
- Webhook signature verification, event-ID idempotency, and replay protection are mandatory before live event acceptance.
- Mock mode must not create external payment links, invoices, orders, captures, refunds, payouts, or transfers.

## Crypto asset information architecture

Provider adapters are read-only by default:

- EVM wallet adapter: native balances, ERC-20 tokens, and NFTs on explicitly supported chains.
- Solana wallet adapter: SOL, SPL token accounts, and supported digital assets.
- Exchange adapter: account asset balances only where a read-only account connector is explicitly authorized and supported.
- Public market-data adapter: token metadata and price references, clearly separated from verified wallet holdings.
- Aave adapter: protocol supply/borrow positions, separately labelled from ordinary wallet balances.

Do not infer a complete portfolio from one chain or one provider. Every asset record must include provider, wallet/account reference (redacted or user-labelled), chain/network, token contract or mint where applicable, asset symbol/name, raw quantity, decimals, valuation currency, price source, observation timestamp, and data completeness status. Unknown or unsupported values remain unknown rather than being reported as zero.

## Unified asset registry and dashboard

Required views:

1. Financial overview: PayPal balances/transaction summaries where exposed, plus crypto asset valuations with clear source and timestamp.
2. PayPal operations: invoice status, payment status, refunds/disputes visibility, payment references, and reconciliation exceptions.
3. Wallet registry: user-labelled public addresses, chain coverage, read-only connection status, and last inspection time.
4. Crypto holdings: native assets, fungible tokens, NFTs, and supported DeFi positions without double-counting supplied assets.
5. Exchange holdings: separately labelled exchange balances; no trading or withdrawal controls.
6. Valuation: USD and ZAR display where reliable pricing and FX sources are available; show stale/missing price flags.
7. Activity: inbound/outbound chain events and PayPal events, with provider identifiers and evidence links.
8. Audit: data source, permission scope, operator approval, timestamps, failures, and reconciliation status.

## Data integrity and security

- Never request, store, display, or transmit seed phrases, private keys, recovery codes, or signing secrets.
- Public wallet addresses are not authentication credentials, but should still be treated as user-linked financial data.
- No wallet signing, transaction construction for broadcast, transfers, swaps, staking, bridging, trading, or withdrawals.
- Use decimal-safe quantity and currency arithmetic; preserve raw integer token amounts and decimals.
- Keep wallet balances, exchange balances, DeFi supplied positions, and borrowed liabilities in distinct categories to prevent double counting.
- Separate observed market value from realized proceeds and settled fiat.
- Show valuation source, quote timestamp, and coverage gaps; do not present indicative prices as executable conversion rates.
- Read-only provider access is preferred; mock fixtures remain available without credentials or network access.

## Supported PayPal mock operations

Marketplace API mock routes (all return `mode: mock`, `Cache-Control: no-store`, and reject non-GET methods):

- `GET /api/v1/paypal/status`
- `GET /api/v1/paypal/invoices`
- `GET /api/v1/paypal/transactions`
- `GET /api/v1/paypal/disputes`
- `GET /api/v1/paypal/payment-links` (empty fixture; creation disabled)
- `GET /api/v1/paypal/reconciliation` (reference counts only; explicitly not financial reconciliation)

Existing mock behaviors:

| Operation | Mock behavior |
|---|---|
| List invoices | One local draft fixture, USD 0.00 |
| List transactions | Empty local fixture |
| List disputes | Empty local fixture |
| List payment links | Empty local fixture |
| Reconciliation | Compare imported/exported references only; no bank writes |

## Explicitly blocked operations

Invoice dispatch, payment-link creation, checkout capture, authorization, refund, payout, transfer, account changes, live API calls, webhook registration, wallet signing, crypto transfers, swaps, trades, withdrawals, and deployment are not implemented or enabled. Mock webhook verification explicitly fails closed; local reference matching is not settlement verification.

## Live integration prerequisites (not performed)

1. Confirm the PayPal account owner, business profile, supported country/currency, and account capability in PayPal.
2. Review official PayPal REST API product requirements and applicable South African availability.
3. Obtain separate scoped authorization for a PayPal sandbox connection; live credentials must never be committed or printed.
4. Obtain user-supplied public wallet addresses and explicit chain/network scope before wallet inspection. Never request signing secrets.
5. Confirm provider coverage, account permission model, and read-only scopes for each exchange or chain provider.
6. Implement OAuth/token handling in a secret manager, least-privilege access, timeouts, bounded retries, and redacted structured logs.
7. Verify webhook signatures against PayPal before accepting events. Enforce event-ID idempotency and retain verification evidence. Current mock adapter blocks webhook registration and live webhook acceptance; no listener exists.
8. Use decimal-safe monetary values and explicit ISO-4217 currencies. Never use binary floating-point for financial amounts.
9. Reconcile PayPal transaction IDs against invoice/order references; never infer settlement from browser redirects.
10. Add contract tests, sandbox integration tests, security review, operator approval, and rollback plan before any live cutover.

## Control gates

- Inspect first; preserve existing files and records.
- Mock mode is the default and must remain usable without network access or credentials.
- Fail closed when mode is unknown, credentials are absent, webhook verification fails, or an idempotency key is missing.
- Human operator review is required for every protected financial or account action.
- No legal, tax, banking, payout, payment, custody, trading, or wallet-signing action is delegated to this integration.
- Any future live activation, production deployment, invoice sending, payment-link creation, or financial transaction requires separate explicit approval.

## Evidence

- Marketplace package: `internal/paypal/mock.go`, `internal/paypal/modules.go`, `internal/paypal/http.go`, and package tests.
- Partner Center adapter: `src/paypal-mock.js`, `tests/paypal-mock.test.js`.
- Partner Center reference reconciliation compares opaque references only; it does not assert settlement or move funds.
- Test entrypoint: Partner Center `npm test`.
- Marketplace CI on the latest recorded head: Go test, vet, compile, and container build steps succeeded; security scan was still running at last inspection.
- Partner Center CI on the latest recorded head: completed successfully.
- Command Centre checks previously hit a Vercel build-rate limit; no deployment was performed.
