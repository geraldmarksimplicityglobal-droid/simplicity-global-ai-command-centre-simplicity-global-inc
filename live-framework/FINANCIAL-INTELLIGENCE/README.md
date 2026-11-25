# SG-FIN-001 — Financial Intelligence System

**Status:** additive source foundation; feature branch only; not deployed or connected to a live financial database.
**Scope:** fiat + cryptocurrency operations, integrated with the existing Live Enterprise Framework.
**Accounting authority:** connected Xero organisation remains the current accounting system of record. This module does not create a competing general ledger.

## Design principles
- Preserve existing framework modules and the ARCHIVE/Zapier draft pull request.
- Read-only provider posture by default.
- Financial records are normalised into proposals and evidence records; no automatic posting, payment, transfer, invoice issuance, tax filing, or wallet signing.
- Financial actions require operation- and resource-scoped approval, followed by separate execution authorisation.
- High-risk actions require reviewer/requester separation and executor/reviewer separation.
- Amounts use integer minor units (BigInt) to avoid floating-point accounting errors.
- Reconciliation produces candidates only; a human must confirm matches.
- Provider credentials belong in a future secret manager/OAuth integration, never in source files or logs.
- Preserve source currency and provenance. ZAR is the current reporting base, not a reason to overwrite source-currency values.

## Initial capabilities
1. Exact decimal-to-minor-unit conversion and formatting.
2. Double-entry journal proposal validation, balanced per currency.
3. Immutable source-event normalisation and duplicate detection.
4. Approval policy for financial and production-impacting operations.
5. Read-only provider capability contract.
6. Conservative bank/ledger reconciliation candidate generation.

## Integration status
| Integration | Current evidence | Module posture |
|---|---|---|
| Xero | Connected; South Africa; ZAR; Africa/Johannesburg | Read-only contract; application OAuth adapter still required |
| Crypto market data | Market-data connectors available | Market data only; not proof of ownership, wallet balance, or settlement |
| Wallet / chain evidence | No connected wallet or chain source verified | Not connected; future evidence adapter required |
| Supabase | Organisation connected; no projects listed | No database target selected or provisioned |
| Windows 11 / VS Code | GERALD-PC currently offline | Local integration not verified |

## Local tests
Requires Node.js 22+. Run npm test from this directory. The package uses only Node's built-in test runner.

## Explicitly out of scope
- Posting journals to Xero or another ledger.
- Creating, editing, voiding, or sending invoices.
- Initiating bank, card, exchange, or crypto-wallet payments/transfers.
- Signing transactions or storing private keys/seed phrases.
- Tax/VAT submissions or regulatory filings.
- Production deployment, database provisioning, or paid infrastructure creation.

Those capabilities require separately reviewed adapters, scoped credentials, operational runbooks, and explicit approval.
