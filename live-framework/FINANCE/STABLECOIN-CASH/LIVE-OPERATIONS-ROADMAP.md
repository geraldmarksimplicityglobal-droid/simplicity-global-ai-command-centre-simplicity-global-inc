# SG-STABLECOIN-CASH-001 — Live Treasury Operations Extension

Status: proposed production architecture; NOT activated
Version: 0.2.0-draft
Environment: sandbox validation first, followed by separately authorised production enablement
Timezone: Africa/Johannesburg

## Objective

Extend the treasury from read-only visibility to a production-capable system that can process authorised real-money bank and EVM stablecoin transactions. Real-money capability is a design target; no bank, custodian, wallet, payment rail, or signer is currently verified by this repository change.

## Operating domains

1. Treasury ledger — double-entry accounting, currency sub-ledgers, clearing accounts, fees, FX rates, settlement status, reversals, and immutable audit references.
2. Bank rail adapter — bank balance/statement ingestion, beneficiary verification, debit-order mandate and collection status, payment initiation only where the bank contract and account permissions explicitly support it.
3. EVM adapter — chain-specific token allowlists, read balances, estimate fees, prepare transactions, submit only through an approved signer, and reconcile confirmations/finality.
4. FX and valuation — timestamped, source-labelled rates; stale or unavailable rates block valuation release and do not silently substitute.
5. Reconciliation — match bank entries, payment references, chain events, fees, and ledger postings; unmatched items enter exception queues.
6. Operations control plane — health, queue depth, alerts, approvals, incident records, backup status, and kill-switch state.
7. Autonomous VM — isolated worker for monitoring, reconciliation, and approved job execution; no unrestricted shell, no seed phrase/private key files, and no direct access to production signing material.

## Production transaction lifecycle

DRAFT → VALIDATED → AWAITING_APPROVALS → APPROVED → SUBMITTED → PENDING → CONFIRMED/SETTLED

Terminal and exception states: REJECTED, EXPIRED, FAILED, REVERSED, RECONCILIATION_HOLD.

Every transaction must carry a unique idempotency key, source instruction ID, legal entity, source account/wallet, destination/beneficiary, asset, chain ID where applicable, exact integer amount, fee ceiling, requested execution window, expiry, and evidence references. Replays must not create duplicate payments.

## Real-money release gates

Production transaction submission is blocked until all applicable gates are evidenced:

- Legal entity, beneficial ownership, authorised signatories, and account mandates verified.
- Bank, payment provider, custodian, and/or wallet ownership verified through provider-controlled channels.
- Debit-order mandate and collection authority verified for the relevant account and creditor; mandate scope, maximum amount/frequency, cancellation and dispute handling recorded.
- EVM chain ID, token contract address, decimals, issuer, custody model, and destination allowlist independently verified.
- Production signer is isolated (prefer hardware-backed or institutional MPC); signer policy enforces chain, token, recipient, amount, and fee limits.
- Maker-checker approval by two distinct authorised operators for every outbound payment or policy change. No self-approval.
- Per-transaction, daily, monthly, counterparty, and asset exposure limits configured and tested.
- Applicable South African and cross-border legal, tax, AML/CFT, sanctions, consumer, and payment-system reviews completed by qualified responsible parties.
- Monitoring, incident response, backup/restore, key recovery, reconciliation, and emergency stop tested.
- Production change reviewed and explicitly approved; no sandbox credential may be reused as a production secret.

## Autonomy policy

Autonomous without per-transaction approval:
- Read provider health, read authorised balances/statements, monitor debit-order schedules and statuses, calculate valuations, reconcile records, create alerts, and prepare unsigned payment proposals.
- Retry read-only requests with bounded backoff; never retry a payment submission unless provider idempotency and transaction status prove safe.

Requires transaction-specific human approval:
- Initiating a debit order/collection, bank transfer, stablecoin transfer, token approval, swap, bridge, withdrawal, redemption, beneficiary change, limit increase, signer-policy change, or release of funds.
- Approval must display exact amount, currency/asset, fee ceiling, source, destination, execution window, and consequence. Approval expires and is bound to that immutable payload.

Never permitted:
- Autonomous key export, seed phrase access, policy bypass, hidden beneficiary substitution, unbounded retries, silent fee escalation, or execution when chain/contract/beneficiary/mandate status is unknown.

## Debit-order time watch

The watch is a scheduler and reconciliation service, not authority to debit. It should:
- Ingest authorised mandate metadata and expected collection calendars from the bank/provider or accounting system.
- Store creditor/mandate reference, expected date, permitted amount/frequency, status, and source evidence.
- Alert before and after expected collection windows; compare expected vs actual entries.
- Flag duplicates, amount/frequency deviations, unauthorised references, failed collections, reversals, and missed entries.
- Never create, amend, or submit a mandate/collection without a separate approved instruction and bank-side authorisation.
- Use Africa/Johannesburg for display and scheduling; persist UTC timestamps alongside local display time.

## VM and network boundaries

- Deploy as a dedicated, patched VM in a private network with firewall allowlists, least-privilege service identities, encrypted disks, managed secrets, and centralised logs.
- Separate web/API, scheduler, reconciliation worker, and signing boundary. The VM must not contain private keys or seed phrases.
- Production signer is a separate service/device with explicit policy and dual control.
- Use separate sandbox and production accounts, RPC endpoints, API credentials, databases, queues, and encryption keys.
- Egress allowlist only to approved bank/provider APIs, RPC endpoints, telemetry, and update sources.
- Backups encrypted, access-controlled, tested, and retained according to approved policy.
- Emergency stop must stop new submissions while preserving read-only monitoring, status polling, reconciliation, and audit capture.

## Delivery sequence

A. Discovery and evidence: identify legal entity, banks, debit-order provider, custody model, wallet addresses, networks, token contracts, FX source, and authorised operators. No secrets in Git.
B. Sandbox integration: local EVM simulator and provider sandboxes; test happy paths, failures, replays, reversals, fee spikes, chain reorgs, clock drift, and reconciliation exceptions.
C. Live read-only: connect verified production data sources with least privilege; validate balances, statements, mandate schedules, and chain inventory.
D. Payment preparation: generate unsigned, fully validated payment proposals; demonstrate approval UX and signer policy in sandbox.
E. Controlled production pilot: only after all release gates pass, use a separately approved low-value pilot with strict limits, dual approval, real-time monitoring, and documented rollback/stop procedure.
F. Scale-up: raise limits only through documented risk review and explicit approval.

## Current known blockers

- DigitalOcean inspection found zero droplets; account reports trial status and droplet-limit warning. No VM provisioned.
- Desktop Commander devices were offline at inspection.
- Alchemy and Etherscan integrations were connected, but no production signer or custody authority was verified.
- No Supabase project was found in the connected organisation; no database migration was applied.
- No bank/debit-order provider, account mandate, custodian, production wallet, token allowlist, FX source, or signatory evidence was verified.
- Legal/compliance approval and transaction limits are not evidenced.

## Acceptance criteria

- No payment can be submitted with a missing/invalid mandate, beneficiary, token contract, chain ID, approval, or limit.
- Duplicate events and retries cannot duplicate a payment.
- Two-person approval is enforced outside the application UI as well as within it.
- Every state transition and provider response is auditable.
- Ledger balances and bank/chain reconciliations are reproducible.
- Emergency stop blocks new outbound transactions and leaves monitoring/reconciliation running.
- Production enablement is impossible from sandbox credentials or a single configuration toggle.

## Explicit non-claim

This document does not activate a bank rail, create a debit-order mandate, provision a VM, deploy software, connect a wallet, sign a transaction, or move money. Those require provider-side setup, verified authority, tested implementation, and explicit transaction approval.
