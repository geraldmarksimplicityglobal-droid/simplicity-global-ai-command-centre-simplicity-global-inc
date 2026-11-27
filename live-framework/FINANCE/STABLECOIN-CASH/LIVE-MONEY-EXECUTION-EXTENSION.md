# SG-STABLECOIN-CASH-001 — Live-Money Execution Extension

**Status:** Design extension only; not activated  
**Version:** 0.2.0-draft  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Objective:** Evolve the treasury from visibility/accounting into a governed system capable of receiving, holding, converting, paying and reconciling real funds.

## 1. Capability target

The target product is a real-money corporate treasury, not merely a dashboard. It may ultimately support:

- Fiat collection and payouts through an authorised bank/payment provider.
- Debit-order presentment and collection only under a verified mandate and provider agreement.
- Stablecoin deposits, custody, transfers, redemption and conversion through approved, appropriately authorised providers.
- Multi-currency cash management and FX conversion.
- Reconciliation across bank statements, payment-provider events, blockchain events and the internal double-entry ledger.
- Scheduled treasury operations and autonomous monitoring/reconciliation.

A capability is not considered live merely because a provider connector is installed or a network endpoint is configured.

## 2. Separate execution planes

1. **Observation plane:** Read balances, statements, payment events, chain events, FX and provider health. No mutation permissions.
2. **Decision plane:** Forecast liquidity, detect due obligations, calculate fees/FX, check limits and prepare a proposed payment or debit batch.
3. **Approval plane:** Verify mandate, beneficiary, amount, currency, purpose, available funds, risk checks and approval quorum. Bind approval to a canonical request digest.
4. **Execution plane:** A separately deployed, narrowly privileged service submits only approved instructions to a verified provider or wallet signer.
5. **Settlement/reconciliation plane:** Observe provider acceptance and final settlement; post ledger entries idempotently; resolve exceptions.
6. **Control plane:** Kill switch, credential revocation, limits, provider suspension, incident response and immutable audit.

No observation or decision component receives signing keys or payment credentials. The execution service must not accept arbitrary natural-language instructions as payment authority.

## 3. Debit-order lifecycle

Debit orders require a verified legal mandate and provider-supported collection rail. Model the lifecycle explicitly:

- `draft` → `mandate_pending` → `mandate_verified` → `scheduled` → `presented` → `accepted` / `rejected` → `settled` / `returned` / `disputed` → `reconciled`.

Controls:

- Store mandate reference, debtor identity reference, creditor legal entity, collection scheme, permitted amount/frequency, start/end dates, cancellation status and evidence pointer.
- Enforce scheme-specific notice, timing, retry, dispute and cancellation rules only after provider and legal validation.
- Do not infer consent from a bank account number, invoice, prior payment or wallet ownership.
- Prevent duplicate presentment with provider idempotency keys and a unique mandate + collection-period key.
- Apply amount/frequency caps and stop on mandate mismatch, cancellation, dispute, sanctions/AML alert, stale account status or insufficient evidence.
- A time watch may prepare a due-item queue and alert an operator. Automatic presentment remains off until each mandate and the collection provider's authority are validated and an execution policy is separately approved.
- Returns and disputes create compensating ledger entries; never erase the original collection.

## 4. Stablecoin and on-chain lifecycle

For each asset and chain, maintain a reviewed registry containing chain ID, token contract, decimals, issuer, freeze/blacklist controls, redemption path, liquidity venues, bridge exposure, reserve disclosures, source URLs, reviewer and review date.

On-chain transfers require:

- Verified treasury wallet ownership/custody model and destination allowlist.
- Exact chain, contract, token quantity in base units, recipient, fee ceiling and request digest.
- Independent simulation and policy evaluation.
- Hardware-backed or regulated custodian signing where appropriate; keys never stored in application configuration, source control or ordinary logs.
- Explicit approvals appropriate to value/risk; no unlimited hot-wallet authority.
- Chain finality policy, reorg handling, sanctions screening and reconciliation before a payment is treated as settled.

Do not treat stablecoin symbols or a nominal peg as proof of issuer, contract identity, solvency, redemption availability or legal classification.

## 5. Autonomous treasury supervisor

The autonomous supervisor may run continuously to:

- Monitor service health, provider availability, wallet/bank balances and event queues.
- Forecast liquidity and flag upcoming debit orders, payroll, supplier and tax obligations.
- Detect duplicate, anomalous, out-of-policy or unmatched activity.
- Prepare payment proposals and debit batches.
- Run reconciliation, generate close packs and alert on exceptions.
- Restart stateless monitoring workers and fail over read-only services under tested runbooks.

It may not independently add beneficiaries, create or alter debit mandates, increase limits, approve its own proposals, change allowlists, rotate/reveal credentials, bypass sanctions controls, sign arbitrary transactions, or move funds outside a pre-approved execution policy. Recovery actions must be idempotent, observable and reversible where possible.

## 6. Policy model for real-money execution

Every executable instruction must include:

- Authenticated initiating principal and legal entity.
- Beneficiary/debtor and verified mandate or allowlist reference.
- Amount, currency, fee ceiling, purpose and value date.
- Source account/wallet and destination account/wallet.
- Provider/chain/contract identifiers.
- Risk-screening and funds-availability evidence.
- Canonical request digest, policy version, expiry and idempotency key.
- Independent approval evidence and execution result.

Required controls:

- Role separation: requester, approver, treasury operator and auditor.
- Two-person approval by default for external payments; configurable higher quorum for high-risk/high-value actions.
- Per-transaction, daily, beneficiary, asset and aggregate exposure limits.
- Cooling-off or out-of-band verification for new beneficiaries and mandate changes.
- Step-up authentication and signed approval challenge.
- Time-limited approvals bound to immutable transaction details.
- Emergency global and per-provider kill switches.
- Deny by default on missing evidence, stale prices, unknown assets, sanctions hits, policy mismatch or reconciliation backlog.
- No self-approval and no policy change by the execution runtime.

## 7. Environments and promotion

- **Local sandbox:** Mock bank/provider adapters and mock ERC-20 contracts; no real credentials or external broadcasts.
- **Provider test environment:** Provider-issued test credentials and test beneficiaries only.
- **Live observation:** Real balances/events/statements, read-only credentials.
- **Live execution pilot:** One legal entity, one approved provider, one currency/rail, allowlisted counterparties, low limits, named approvers and monitored operating window.
- **General live operation:** Expand only after a signed pilot review, reconciliation proof, incident drill, legal/compliance approval and explicit release approval.

Sandbox and live credentials, databases, queues, signing services and deployment identities must be isolated. No automatic promotion from sandbox to live.

## 8. Evidence and release gates

Before a live pilot, obtain and record:

1. Verified contracting legal entity, jurisdiction, directors/signatories and authority matrix.
2. Legal/compliance opinion for the exact activities, jurisdictions, providers and customer-funds model.
3. Provider due diligence and executed bank/payment/custody agreements.
4. Verified bank accounts, mandates and/or custody wallet ownership evidence.
5. Approved asset/chain/contract and beneficiary allowlists.
6. Production-grade secrets manager, key custody, MFA, least-privilege identities and credential rotation.
7. Database, immutable audit, tested backup/restore, disaster recovery and monitoring.
8. Tested ledger invariants, idempotency, duplicate prevention, return/reversal and reconciliation.
9. Penetration/security review, incident response exercise and operational runbooks.
10. Explicit approval of the pilot scope, limits, approvers, start date and kill-switch owner.

## 9. Current observed blockers

The infrastructure inspection recorded:

- No DigitalOcean droplets were present; account reported a trial status and a droplet-limit warning.
- Both registered Desktop Commander devices were offline.
- No Supabase project was found for this subsystem.
- No bank, debit-order collection provider, off-ramp or custodian was verified.
- No treasury wallet address/custody owner or chain-specific asset allowlist was supplied.
- No legal entity/signatory authority matrix or legal/compliance approval was recorded.

Therefore a production VM, payment rail or signer cannot be truthfully described as active. Resolve the provider/account limits and connection gaps before provisioning or enabling a production executor.

## 10. Non-goals and hard stops

This extension does not create a bank account, debit-order mandate, payment-provider contract, regulatory licence, wallet, custody relationship or legal authority. It does not initiate a debit, transfer, redemption, swap or payout. No production migration, VM creation, provider connection or live transaction is performed by committing this design.

**Completion statement:** The architecture now specifies the path to real-money operation, including debit-order lifecycle and bounded autonomy. The treasury remains non-operational for live execution until the evidence and release gates above are satisfied and the exact pilot is separately authorised.
