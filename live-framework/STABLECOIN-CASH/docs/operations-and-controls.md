# SG-STABLECOIN-CASH-001 — Operations and Control Specification

## 1. Asset register

Each asset observation should include:
- Internal asset ID and canonical symbol.
- Network name and chain ID.
- Contract/mint address and token decimals.
- Issuer and redemption mechanism, where verified.
- Custody/provider identity and account reference (opaque).
- Source system, provider record ID, observed-at timestamp and evidence hash/reference.
- Verification state: unverified, source-verified, independently-reconciled, exception.
- Balance status: not supplied, observed, reconciled. Never infer a balance from market data.

Do not treat ticker symbols as globally unique. Asset identity is the tuple of network, contract/mint address and decimals, with issuer metadata as supporting evidence.

## 2. Treasury instruction lifecycle

`draft → validated → simulated`

- Draft: user-provided proposal only.
- Validated: schema, asset precision, network and opaque destination reference checked.
- Simulated: deterministic local simulation result; no external request and no funds moved.
- Any attempt to request live execution is rejected by this module.

A future production lifecycle is deliberately undefined until provider contracts, legal authority, risk limits, transaction approvals, separate execution authorisation, and security review are completed.

## 3. Debit-order time watch

The watcher reads a schedule supplied by an authorised source and classifies it as:
- upcoming — due time is in the future;
- due — due time equals the observation time;
- overdue — due time has passed;
- inactive — schedule is not in scheduled state.

The watcher must not submit or retry collections. It must record source provenance, timezone-aware due time, observation time, alert state and delivery evidence. A schedule alert is not proof that a debit order exists or that a bank has accepted it.

## 4. Reconciliation

Reconciliation compares independently sourced records by provider reference, amount, currency/asset, network, timestamp window, and transaction hash where applicable. Output is a candidate with explicit match confidence and exception reasons. Human confirmation is mandatory. No automatic journal posting, payout marking, balance adjustment, or transfer is permitted.

## 5. Risk and failure controls

- Unknown network, contract, issuer, decimal precision or custody provider → quarantine.
- Duplicate or conflicting source event → quarantine; do not silently overwrite.
- Chain reorganisation or insufficient confirmations → pending/exception, according to a network-specific policy.
- Missing or mismatched transaction hash → unmatched.
- FX or stablecoin peg deviation → valuation exception; never assume 1:1 fiat value.
- Provider outage → pause ingestion; no blind retries of financial writes.
- Stale price or balance evidence → mark stale; never extrapolate as current.
- Reconciliation mismatch → exception queue and human review.
- All timestamps stored in UTC with source timezone preserved for schedules.

## 6. Production release gates

Production remains disabled until all are independently evidenced:
1. Legal entity and authorised signatories confirmed.
2. Provider agreements and official API capabilities verified.
3. Applicable South African and cross-border regulatory review completed.
4. KYC/AML, sanctions, fraud, privacy and data-retention controls approved.
5. Custody and key-management architecture independently reviewed.
6. Risk limits, transaction limits, liquidity and redemption policies approved.
7. Double-entry accounting mapping and reconciliation controls approved.
8. Independent security assessment and incident-response runbook completed.
9. Sandbox tests, failure/recovery tests and backup/restore evidence passed.
10. Separate written approval for each production capability and environment.

A general request to "enable all" is not a substitute for operation-specific approval or provider authority.
