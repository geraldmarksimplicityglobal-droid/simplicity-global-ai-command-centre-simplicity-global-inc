# SG-FIN-001 — Integration and delivery plan

## Source-of-truth model
- Xero remains the accounting ledger until a separately approved migration decision is made.
- This module stores references, normalised observations, evidence metadata, reconciliation candidates, and approval/audit events.
- It must not silently duplicate posted accounting balances or become a second general ledger.
- Each event retains provider, provider record ID, source currency, source amount, event timestamp, external reference, and evidence reference.
- ZAR is the currently verified Xero base currency. Preserve other source denominations; valuation requires a timestamped rate source and explicit valuation policy.

## Target subsystems
1. **Invoice intelligence:** PDF/image metadata, OCR extraction, line-item normalisation, duplicate detection, supplier/customer matching, draft classification and evidence links. Never issue or send invoices automatically.
2. **Fiat accounting:** Xero read-only reporting, invoices, bills, bank transactions, chart-of-account mapping, receivables/payables ageing, and cash/P&L/position reporting.
3. **Crypto accounting:** wallet and exchange account inventory, chain/network identification, transaction hashes, confirmations, fees, custody/source evidence, cost basis and valuation snapshots. A market quote is not proof of a transaction or asset ownership.
4. **Double-entry proposals:** validate balanced journal proposals against an approved chart-of-accounts mapping. Posting remains disabled.
5. **Reconciliation:** match bank, ledger, invoice and blockchain evidence into candidate groups; human confirmation required.
6. **Compliance and tax evidence:** retain source documents, valuation timestamps, transaction classifications, approval records and audit evidence. Tax treatment requires qualified South African review and applicable jurisdiction schedules.
7. **Financial dashboards:** cash position, P&L, balance sheet, receivables, payables, invoice status, evidenced crypto holdings, fees, FX exposure, and exception queues.
8. **Automation:** reminders and draft reports can be proposed; payments, transfers, journal posting, billing and production changes remain approval-gated.
9. **Audit and access:** organisation/legal-entity scoping, least privilege, immutable event history, evidence hashes, retention controls and tested backup/restore.

## Provider integration status
| Provider / data source | Current state | Required next step |
|---|---|---|
| Xero | Connected via ChatGPT integration; organisation is South African and ZAR-based | Configure dedicated application OAuth; start with read-only scopes |
| Microsoft Partner Center | Publisher/Partner Center notices found; identity verification action required; API app registration/consent not verified | Complete authorized identity verification, confirm program eligibility, then obtain tenant-owner approval for read-only API app registration and delegated consent |
| Supabase | Connected organisation; zero projects returned | Select provider, region and cost; create only after explicit approval |
| Crypto market data | Public market data tools available | Indicative pricing only; store source and timestamp |
| Wallet / blockchain indexer | No verified connection | Select networks and read-only provider; test transaction-hash verification |
| Bank feeds | Xero chart includes bank accounts; live feed state not inspected | Inspect bank transaction/statement feed read-only |
| Windows local runtime | GERALD-PC offline | Reconnect before local VS Code setup or tests |

## Delivery gates
### Gate 1 — source foundation
Additive feature branch, module manifest, deterministic core logic and unit tests. No database migrations or live writes. Verify CI and review the diff.

### Gate 2 — data model and connector contracts
Select entity boundaries and legal-entity ownership. Design reviewed additive migrations for invoices, source events, assets, valuations, journal proposals, reconciliation, approvals and audit. Configure read-only Xero OAuth and evidence-only blockchain provider contracts.

### Gate 3 — read-only integration
Connect a non-production environment to approved test/sandbox credentials. Import read-only invoices, bills, chart of accounts, bank transactions and reports. Validate duplicate handling, currency precision, dates, timezone and source provenance.

### Gate 4 — reconciliation and reporting
Add human-reviewed reconciliation workbench and financial dashboards. Test FX conversion and crypto valuation policies. Add exception queues and evidence export.

### Gate 5 — controlled write capabilities
Each capability requires a separate change request and approval: journal posting; invoice issue/send; payment/bank transfer; exchange order or wallet signing/broadcast; tax submission; production migration/deployment. Approval and execution authorisation must be distinct. High-risk reviewer and executor must be different people. No private key or seed phrase may enter the application.

### Gate 6 — production readiness
Require security review, privacy assessment, accounting/tax review, tenant isolation tests, backup/restore evidence, monitoring, incident response, rollback plan and explicit production release approval.

## Current blockers
- No Supabase project/database is available through the connected account.
- No application-specific Xero OAuth client is configured or verified.
- No wallet/blockchain transaction provider is connected.
- Windows workstation is offline, preventing local environment verification.
- No legal/accounting sign-off or production release approval has been recorded.
