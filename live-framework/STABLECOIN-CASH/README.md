# SG-STABLECOIN-CASH-001 — Stablecoin Treasury Control Plane

**State:** additive sandbox source foundation on a feature branch. Not deployed, not connected to a wallet, bank, exchange, blockchain indexer, or live debit-order provider.

## Purpose

Provide a controlled treasury layer for asset evidence, instruction preparation, sandbox simulation, debit-order schedule monitoring, and reconciliation hand-off. It extends SG-FIN-001; it is not a replacement general ledger or a custody service.

## Operating boundaries

- Sandbox-only instructions. Live execution is hard-disabled in this module.
- No wallet private keys, seed phrases, signing, transaction broadcast, bank credentials, or raw payment credentials are accepted or stored.
- Stablecoin market prices are not evidence of ownership, custody, available balance, redemption, or settlement.
- An asset record must identify token, network, contract/mint address, decimals, source, observation time, and evidence reference before it can be treated as verified. No holdings are asserted by this module.
- Debit-order monitoring is schedule observation and alerting only. It does not create, amend, submit, collect, or retry a debit order.
- Treasury observations and settlement matches are candidates until independently evidenced and human-confirmed.
- SG-FIN-001 remains the accounting proposal and reconciliation layer; Xero remains the current accounting system of record until a separately approved migration.

## Initial capabilities

1. Create and validate sandbox treasury instructions using integer token base units.
2. Simulate a validated instruction without moving funds.
3. Evaluate debit-order due windows and emit upcoming/due/overdue alerts only.
4. Preserve opaque destination references rather than storing wallet or bank credentials.
5. Hand reconciliation candidates to SG-FIN-001 for human review.

## Test

From this directory, run:

`npm test`

Requires Node.js 22+. The module uses Node's built-in test runner.

## Provider onboarding checklist

- Confirm contracting legal entity, beneficial ownership, authority, and applicable jurisdiction.
- Obtain provider's official API and sandbox documentation.
- Verify licensing, custody model, supported networks/assets, redemption terms, fees, limits, and settlement semantics.
- Use provider-issued sandbox credentials in an approved secret manager only.
- Verify token contract/mint address and network identifiers from authoritative sources.
- Implement read-only evidence ingestion first, including signature/replay protection for webhooks.
- Reconcile independently against bank, exchange, custodian, and chain evidence.
- Complete security, privacy, AML/sanctions, accounting and tax review.
- Require separate approval and execution authorisation for every future production capability.

## Out of scope

No live stablecoin or fiat transfers, debit-order initiation, automatic withdrawals, exchange orders, wallet signing, smart-contract deployment, bank onboarding, account changes, or production deployment.
