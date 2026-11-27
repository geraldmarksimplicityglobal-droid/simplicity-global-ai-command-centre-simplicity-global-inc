# SG-STABLECOIN-CASH-001 — Real-Money Execution Extension

**Status:** Design extension; not an activation or payment mandate  
**Branch:** `codex/sg-stablecoin-cash-001`  
**Target:** Governed production treasury execution after independent readiness gates  
**Current production state:** Disabled

## 1. Target operating outcome

Extend the treasury from visibility and accounting into a controlled operating system capable, once authorised and connected, of receiving funds, holding treasury balances, executing approved bank debit orders and payouts, settling approved EVM stablecoin transfers, converting currencies through regulated providers, reconciling every movement, and producing auditable statements.

The orchestration service is not itself a bank, payment institution, exchange, custodian, stablecoin issuer or regulated financial-services licence. Funds remain with named, verified banks, payment providers and custodians. The system must not imply that a connected API or wallet confers legal authority.

## 2. Capability lanes

| Lane | Capability | Intended autonomy | Activation condition |
|---|---|---|---|
| A | Bank account and payment-provider ingestion | Scheduled read-only sync | Named provider, account owner mandate, read-only credentials |
| B | Debit-order calendar and mandate registry | Detect due dates, duplicates, amount changes and returns; alert | Verified mandate records and bank feed |
| C | Receivables and payables | Prepare invoices, payment batches and cash forecasts | Approved accounting source and entity mapping |
| D | Fiat execution | Submit approved debit orders, payouts and transfers | Provider supports API execution; legal mandate, beneficiary validation, dual approval and limits |
| E | EVM settlement | Submit approved stablecoin transfers and monitor finality | Verified custody/signing model, allowlisted chain/token/recipient, policy approval |
| F | FX and conversion | Quote, compare, and execute approved conversions | Regulated provider, executable quote, spread/fee limits and approval |
| G | Reconciliation and close | Match statements, provider events, chain events and ledger | Reliable source feeds and tested exception handling |
| H | Autonomous operations | Monitor, retry safe reads, queue exceptions, alert and recover services | Isolated VM, secrets manager, backup, monitoring, incident runbooks |

Autonomy applies to bounded operational decisions and approved transaction policies. It does not bypass legal authority, provider mandates, maker/checker controls, limits, or emergency stops.

## 3. Transaction lifecycle

1. **Ingest:** collect a payment request, due debit order, invoice, or treasury instruction from an authorised source.
2. **Normalise:** bind it to the correct legal entity, currency, account, counterparty and purpose.
3. **Screen:** verify beneficiary allowlist, mandate, sanctions/AML evidence supplied by the provider, duplicate status, fraud signals and account ownership.
4. **Assess liquidity:** confirm available balance, reserve requirements, expected obligations, FX exposure and concentration limits.
5. **Quote:** obtain a current provider quote for FX or conversion; enforce maximum spread, fee, slippage and quote-age limits.
6. **Simulate:** construct the exact provider request or EVM transaction; validate chain ID, contract, decimals, amount, destination, gas and nonce where applicable.
7. **Approve:** enforce maker/checker separation and threshold-based approval. A request digest must bind every material field and expire.
8. **Execute:** only the dedicated execution service may call the provider or signer, and only after revalidating the approved digest and policy version.
9. **Verify:** capture provider reference or transaction hash; monitor pending, confirmed, finalised, rejected, returned or reversed states.
10. **Reconcile:** post balanced double-entry entries and match external evidence. Exceptions remain open and block close where material.
11. **Report:** produce statements, audit trail, fee/FX breakdown, outstanding items and proof references.

A successful API response is not proof of final settlement. EVM submission is not finality; bank submission is not completed clearing.

## 4. Debit-order control plane

The debit-order module must distinguish:
- mandate registration and cancellation;
- expected collection schedule;
- pre-notification and dispute windows where applicable;
- collection submission;
- bank acceptance, settlement, return, reversal and dispute;
- reconciliation and customer/entity ledger posting.

Each mandate record requires legal entity, debtor/account owner, creditor, mandate reference, permitted amount or calculation rule, frequency, start/end dates, currency, evidence location, status, change history and verification source.

Controls:
- no debit order may be created from an inferred invoice or unverified email;
- mandate evidence and account authority must be validated before submission;
- enforce amount/frequency caps and duplicate detection;
- require additional approval for first collection, changed mandate, unusual amount, new creditor or out-of-pattern timing;
- honour stop, cancellation, dispute and return states;
- never retry a failed collection automatically unless the provider's rules, mandate and retry policy explicitly permit it;
- log idempotency keys and provider references;
- never represent a scheduled debit as collected cash.

## 5. EVM settlement control plane

The signer must be isolated from the application and database. Preferred order:
1. institutional custodian with policy controls and transaction approvals;
2. dedicated MPC/HSM-backed signer with role separation;
3. multisig treasury wallet with independently held signers.

Do not store seed phrases or raw private keys in source control, application configuration, logs, VM disk or general-purpose environment variables. A hot wallet must have a deliberately small operating float and replenishment policy; reserve assets remain under stronger custody.

Before signing, enforce:
- exact chain ID and verified RPC endpoint;
- chain-specific token contract and decimals allowlist;
- verified recipient/beneficiary allowlist;
- amount, velocity, daily and aggregate limits;
- gas ceiling, nonce management and simulation;
- request digest, approval quorum and expiry;
- sanctions/compliance screening policy and evidence;
- pause switch and emergency key revocation procedure.

No arbitrary contract calls, unlimited approvals, blind signing, unrestricted bridge routes, or autonomous DeFi lending/staking.

## 6. Policy and limits

Limits are configuration, not hard-coded assumptions. The legal entity's authorised signatories must approve:
- per-transaction cap by rail and currency;
- daily and monthly aggregate caps;
- maximum hot-wallet exposure;
- reserve floor and minimum liquidity horizon;
- counterparty and concentration caps;
- maximum FX spread, slippage, provider fee and quote age;
- approval quorum and approver independence;
- retry, timeout, cut-off and exception policies.

Until these values are signed off, all live execution limits remain zero and execution is disabled.

## 7. Autonomous VM and server architecture

Recommended separation:
- **Control plane:** API, admin console, policy configuration and approval queue; no private signing keys.
- **Data plane:** read-only bank/provider/chain ingestion, event normalisation and reconciliation workers.
- **Execution plane:** isolated worker with outbound allowlists, short-lived credentials, request-digest verification and provider-specific adapters.
- **Signer/custodian:** external regulated custody or HSM/MPC service, independently governed.
- **Persistence:** managed database with tenant/entity RLS, encrypted backups, append-only audit events and tested restore.
- **Observability:** metrics, structured logs with secret redaction, uptime checks, alert routing and incident timeline.

VM baseline: supported LTS OS, non-root service identities, SSH keys only, firewall default-deny, private networking where available, automatic security updates with controlled maintenance, encrypted volumes, backups, monitoring, time synchronisation, vulnerability scanning, dependency pinning and recovery runbook. No production secret should be committed to Git.

## 8. Failure and safety behaviour

- **Fail closed:** if provider, policy, screening, price, RPC, signer, database or reconciliation evidence is unavailable, do not execute.
- **Idempotency:** duplicate delivery or worker retry must not duplicate a payment.
- **Circuit breakers:** pause a rail on abnormal returns, provider errors, chain congestion, depeg, RPC disagreement or suspected compromise.
- **Kill switch:** independently disable all new execution while preserving read-only monitoring and evidence capture.
- **Recovery:** resume only after incident review, reconciliation and authorised restart.
- **No silent mutation:** append corrections/reversals; preserve original evidence and actor identity.

## 9. Required production readiness evidence

- verified legal entity, jurisdiction, beneficial ownership and authorised signatories;
- legal/compliance opinion and provider confirmation for each activity and jurisdiction;
- bank/payment-provider/custodian contracts, API scopes and mandates;
- verified account ownership and test statements;
- signer architecture, key ceremony, recovery and revocation evidence;
- approved chain/token/recipient allowlists;
- signed limits and maker/checker matrix;
- tested double-entry ledger, RLS, idempotency, reorgs, reversals and reconciliation;
- independent security review, penetration test and incident exercise;
- backup restore test and service-level monitoring;
- sandbox end-to-end evidence followed by a separately approved, capped pilot;
- explicit production go-live approval by authorised business owners.

## 10. Current verified blockers and infrastructure facts

As inspected on 27 November 2026:
- DigitalOcean returned zero droplets.
- DigitalOcean account reports trial status and a warning that the maximum allowed Droplet count has been reached; its account panel must resolve this before a new VM can be provisioned.
- Desktop Commander devices registered as `GERALD-PC` and `localhost` were both offline at inspection.
- Alchemy and Etherscan connections exist for network/explorer data; no active treasury wallet or signer was verified.
- Supabase returned no projects.
- No bank, debit-order, regulated off-ramp or custody integration was verified.
- No legal entity/signatory mandate, debit-order mandate set, live transaction limits or chain-specific token allowlist was supplied.

These are blockers, not assumptions to fill in. No VM has been created and no production transaction has been sent.

## 11. Delivery sequence

1. Confirm legal entity, jurisdiction, authorised signatories and treasury purpose.
2. Select bank/debit-order provider, payment provider and regulated custodian; verify supported API scopes using read-only calls.
3. Resolve VM capacity and provision a sandbox host only after region, size, budget and security baseline approval.
4. Provision persistence and secrets management; apply reviewed schema and RLS tests only after explicit approval.
5. Build provider adapters in simulation mode; prove idempotency, ledger balance, reconciliation and exception paths.
6. Run end-to-end sandbox debit-order and EVM settlement tests with test credentials and test funds.
7. Complete legal, compliance, security and operational sign-off.
8. Conduct a capped live pilot with named beneficiaries, low limits, maker/checker and manual supervision.
9. Expand limits and autonomy only by documented approval and measured evidence.

## 12. Explicit non-authorisations

This design extension does not authorise:
- opening accounts or accepting provider terms;
- initiating a real debit order, bank transfer, payout, withdrawal or conversion;
- signing, broadcasting or approving a live EVM transaction;
- moving client or third-party funds;
- deploying a production VM or changing production infrastructure;
- enabling unrestricted autonomous financial execution.

Those actions require provider-specific mandates and separate explicit authorisation. The intended end state is real-money operation under a bounded treasury mandate, not unbounded access to funds.
