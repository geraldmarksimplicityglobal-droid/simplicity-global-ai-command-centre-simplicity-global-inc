# SG-STABLECOIN-CASH-001 — Production Execution Extension

**Status:** Production architecture extension; not activated  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Target:** Controlled real-money treasury operations with bounded autonomy  
**Current execution state:** Disabled pending verified rails, mandates, approvals and compliance evidence

## 1. Purpose

Extend the treasury from visibility/accounting into a production-capable operating design. The target is to initiate and receive real payments through authorised bank, payment-service-provider and/or regulated custody rails, while monitoring EVM stablecoin holdings and settlement. A blockchain RPC provider is not a bank, custodian, payment institution or transaction signer.

The system must distinguish:
- **Debit-order monitoring:** read authorised schedules, mandates, expected collections, bank statement entries, returns and exceptions.
- **Debit-order initiation:** submit a collection instruction only where the company is the authorised originator, the payer mandate is valid, the bank/processor supports the scheme, and the exact instruction passes approval and scheme validation.
- **Supplier/beneficiary payments:** prepare and submit approved payments through a bank/PSP API with verified beneficiary, limits, duplicate prevention and bank-side authentication.
- **Stablecoin transfers:** submit an approved on-chain transaction only through an independently secured signer/custodian and chain-specific allowlist.

No authority to debit a third party is inferred from a user request, bank account connection, invoice, wallet address, or this design document.

## 2. Autonomy levels

| Level | Capability | Policy |
|---|---|---|
| A0 — Observe | Read balances, statements, mandates, chain events, status and health | Enable after read-only provider verification |
| A1 — Reconcile | Match expected and actual entries; classify exceptions | Enable after ledger and source validation |
| A2 — Prepare | Create payment/debit-order proposals and execution payloads | Enable with maker/checker controls |
| A3 — Submit | Send a specifically approved instruction to a bank/PSP/custodian | Disabled until all live gates pass |
| A4 — Autonomous bounded execution | Execute recurring, pre-authorised instructions inside hard limits | Disabled by default; per-instruction and scheme-specific authority required |
| A5 — Unbounded discretionary movement | Choose recipients/amounts or move funds without a bounded mandate | Prohibited |

Autonomy is not permission to invent payees, amounts, payment dates, mandates, funding sources or business purposes.

## 3. Production debit-order lifecycle

1. **Mandate intake:** capture the signed/electronic mandate reference, payer identity reference, originator identity, scheme, permitted amount/frequency, start/end dates, cancellation state and evidence hash. Store only the minimum necessary personal data.
2. **Mandate verification:** verify originator registration and mandate status with the bank/processor using its supported authoritative interface. A locally uploaded document alone is not proof that a bank will accept the instruction.
3. **Schedule watch:** compute expected collection dates in `Africa/Johannesburg`; account for weekends, public holidays, scheme cut-offs, time zones and bank processing windows from the provider's actual rules.
4. **Pre-flight:** validate mandate active status, amount/frequency caps, payer and originator references, available funding/settlement constraints, scheme format, duplicate key and any required notice period.
5. **Approval:** require two distinct authorised human approvers for new mandates, changed mandate terms, first collection, exceptional amounts and any instruction outside a pre-approved recurring rule. Approval binds to a canonical request digest, amount, currency, payer/payee, date, mandate, provider, and expiry.
6. **Submission:** only the bank/PSP adapter may submit. It must use provider-issued idempotency keys and return the provider's acceptance/reference ID. No direct database flag may mark an instruction as submitted.
7. **Settlement:** ingest accepted, pending, settled, rejected, returned, reversed and disputed statuses. Do not equate API acceptance with settlement.
8. **Reconciliation:** match provider/bank statement evidence against instruction and ledger. Unmatched or returned items enter an exception queue and block automatic close.
9. **Cancellation and disputes:** support mandate cancellation, stop instructions, return/reversal workflows and immutable evidence of timestamps and provider acknowledgements.

### Debit-order hard stops

- No valid mandate or mandate verification unavailable.
- Mandate revoked, expired, disputed or outside permitted terms.
- Amount, currency, frequency or date outside mandate.
- Duplicate instruction or uncertain prior submission.
- Provider cut-off/scheme rules unknown.
- Required payer notice not evidenced.
- Sanctions/AML or legal review hold.
- Provider response ambiguous or reconciliation unresolved.

## 4. Real-money payment execution controls

Every instruction must carry:
- legal entity and authorised account identifier;
- provider and rail identifier;
- beneficiary/payer identity and verified destination details;
- amount in integer minor units and ISO currency;
- business purpose, invoice/contract reference and supporting evidence;
- mandate or payment authority reference;
- execution date and expiry;
- policy version, limits and approval identities;
- idempotency key and immutable request digest.

Mandatory controls:
- account and beneficiary allowlists with out-of-band change verification;
- per-transaction, daily, monthly and counterparty limits;
- maker/checker separation and no self-approval;
- cooling-off period for new/changed beneficiaries and mandates;
- duplicate and replay prevention;
- transaction status polling/webhooks with signature verification;
- circuit breaker for provider errors, stale balances, anomalous activity or reconciliation breaks;
- daily reconciliation and immutable audit trail;
- kill switch that disables new submissions without deleting evidence or blocking read-only reconciliation.

Never store bank passwords, card data, private keys, seed phrases, OTPs or signing credentials in Git, source files, logs or general-purpose prompts. Use provider-supported OAuth/service credentials and a dedicated secrets manager with least privilege and rotation.

## 5. Treasury server and autonomous virtual machine

Target deployment is a dedicated, isolated VM or managed container runtime, not the user's workstation. It should run separate services:
- `treasury-api`: authenticated internal API; no direct signing capability.
- `schedule-watch`: debit-order calendar, cut-off and due-item monitor.
- `bank-adapter`: provider-specific read/submission integration, isolated network identity.
- `chain-indexer`: read-only EVM event/balance ingestion.
- `policy-engine`: mandate, allowlist, limit and approval evaluation.
- `execution-worker`: disabled until approved; narrowly scoped provider permission.
- `reconciliation-worker`: bank/PSP/chain/ledger matching.
- `audit-writer`: append-only event storage.
- `alert-manager`: service, liquidity, due-date, failure and anomaly notifications.

VM baseline:
- supported LTS operating system; encrypted volumes and backups;
- private networking; inbound access denied by default; administrative access via short-lived identity;
- host firewall and outbound allowlist to required bank/PSP/RPC endpoints;
- managed secrets; no credentials baked into images;
- process supervision, health checks, metrics, centralised redacted logs and alerting;
- time synchronisation; UTC storage plus explicit `Africa/Johannesburg` business scheduling;
- backup restore tests, patching, vulnerability scanning and incident runbooks;
- separate sandbox and production accounts, credentials, queues and databases;
- no public RPC endpoint or signing key exposed to the application server.

**Current infrastructure constraint:** the inspected DigitalOcean account had no droplets returned and reported its droplet limit reached on a trial account. No VM was created. Desktop Commander devices were offline. Resolve the provider account limit or choose an already authorised hosting provider before provisioning. Provisioning may incur charges and requires explicit infrastructure approval.

## 6. Database and ledger requirements

The earlier proposal listed treasury tables but no database migration was applied. Before production:
- select and provision a persistence provider;
- implement tenant/legal-entity row-level security;
- use a transactional outbox for submission jobs;
- use unique constraints for provider idempotency keys and external references;
- persist mandate versions, approval digests, provider responses and settlement events;
- make journal postings append-only with compensating entries;
- encrypt sensitive mandate evidence and apply retention/deletion policy;
- test backup restoration, access isolation and disaster recovery.

No Supabase project was found in the inspection. Do not assume a database exists.

## 7. Production release gates

All gates are conjunctive. A failed or unknown gate keeps the execution worker disabled.

1. **Entity and authority:** verified legal entity, bank account ownership, signatories, board/delegated authority and user role.
2. **Regulatory:** South African and cross-border legal/compliance review for the actual activity, provider, customer funds flow, debit-order scheme, stablecoin and jurisdictions. Obtain provider onboarding/registration as required. This document is not legal advice and does not establish licensing.
3. **Rail:** signed provider agreement, production API entitlement, supported scheme documentation, settlement/return semantics and provider test certification.
4. **Mandates:** verified valid payer mandates and originator authority for every debit-order collection.
5. **Security:** threat model, independent review, secrets manager, least-privilege credentials, signing/custody design, incident response and penetration testing.
6. **Controls:** allowlists, thresholds, dual approval, duplicate prevention, kill switch and audit evidence tested.
7. **Data:** production database, RLS, migrations, backup/restore and reconciliation controls tested.
8. **Operations:** VM/runtime provisioned, monitored, patched, time-synchronised and recovery tested.
9. **Testing:** sandbox certification, failure injection, duplicate/replay tests, provider outage tests, return/reversal tests and parallel-run reconciliation.
10. **Go-live approval:** named accountable approver signs the release record identifying provider, account, currencies, limits, beneficiaries/mandates, start date and permitted autonomy level.

A general request to "enable live" does not replace these evidence-specific gates.

## 8. Rollout sequence

- **Phase 1 — Observe:** connect approved bank/PSP read-only feed; verify account identity and statement completeness.
- **Phase 2 — Reconcile:** run shadow ledger and debit-order due-date watch; compare against bank/processor outcomes for at least an agreed operating period.
- **Phase 3 — Prepare:** create payment/debit proposals; humans submit through existing bank portal while the system records outcomes.
- **Phase 4 — Controlled submission:** enable one provider, one legal entity, one currency and low limits; require two-person approval for each instruction.
- **Phase 5 — Bounded recurring automation:** only after provider support and explicit mandate/authority; cap amount, cadence, beneficiary, aggregate exposure and expiry; alert and pause on any exception.
- **Phase 6 — Expand:** add currencies, entities, rails and EVM assets individually after separate validation.

## 9. Current verified state and unresolved dependencies

- Alchemy and Etherscan are connected for blockchain data; this is not a bank/payment connection.
- Aave read endpoints are available; no lending or other DeFi execution is authorised.
- No Supabase project was returned.
- No bank, debit-order originator, payment processor, regulated off-ramp or custodian was verified.
- No treasury legal entity, authorised signatories, account ownership evidence or payer mandate evidence was recorded in this workstream.
- DigitalOcean reports a trial droplet limit issue; no VM exists in the inspected account.
- Desktop Commander endpoints were offline.
- No production signing or payment credentials are configured.

Accordingly, this extension defines how the system can be made capable of real-money operations, but does not claim that it is connected, licensed, provisioned or live. Do not represent any payment as submitted or settled without provider evidence.
