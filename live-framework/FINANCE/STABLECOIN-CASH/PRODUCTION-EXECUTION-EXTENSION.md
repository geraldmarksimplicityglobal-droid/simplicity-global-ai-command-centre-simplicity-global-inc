# SG-STABLECOIN-CASH-001 — Production Execution Extension

**Status:** Production-capable design; not connected or authorised for live execution  
**Applies to:** Corporate treasury funds owned by the verified legal entity only  
**Operating timezone:** Africa/Johannesburg  
**Current infrastructure status:** No verified bank/off-ramp/custodian, no treasury database project, no verified wallet/custody owner, and no deployed treasury VM.

## 1. Intended live-money outcome

Extend the monitoring and accounting subsystem into a controlled treasury execution service capable, after onboarding and approval, of:
- initiating authorised corporate debit orders and bank payments through a regulated bank/payment-provider API;
- submitting stablecoin transfers through an approved custody or signing provider;
- processing redemptions/off-ramp settlements through a verified provider;
- recording settlement, fees, FX, reversals, returns and exceptions in a double-entry ledger;
- reconciling provider statements and on-chain finality against the internal ledger.

This system must not act as an unlicensed bank, payment institution, exchange, custodian or service provider for third-party funds. Initial scope is the verified entity's own treasury, subject to legal advice and provider terms. No client funds or third-party payment processing is in scope by default.

## 2. Runtime architecture

1. **Treasury API** — authenticated request intake; schema validation; idempotency keys; entity and role scoping.
2. **Policy engine** — validates account ownership, mandate, beneficiary, currency, amount, limits, available liquidity, sanctions/AML evidence, risk status and approval quorum.
3. **Schedule service** — due-date calendar, cut-off windows, holiday calendar, timezone-aware debit-order watch and retry windows.
4. **Approval service** — maker/checker separation; approvers must be distinct identities; signed approval binds to an immutable transaction digest.
5. **Execution adapters** — separate adapters for bank debit orders, bank transfers, stablecoin custody/signing, and off-ramp providers. Each adapter has independent credentials, scopes, health checks and circuit breakers.
6. **Settlement observer** — polls provider status and indexes chain events; distinguishes submitted, accepted, pending, confirmed, finalised, returned, rejected and reversed.
7. **Ledger/reconciliation service** — append-only double-entry postings; provider statement matching; on-chain matching; daily close and exception queue.
8. **Operations plane** — metrics, structured logs with secret/PII redaction, alerting, backups, restore drills and incident runbooks.

The monitoring plane and execution plane must use separate identities and permissions. A monitor-only process must have no signing key, payment-write scope or access to a transaction submission endpoint.

## 3. Live debit-order workflow

1. Import a bank/provider mandate or debit-order instruction using an authorised read-only connection.
2. Verify the legal entity, debtor/creditor identities, mandate reference, mandate status, amount or calculation basis, currency, frequency, next due date and cancellation/dispute status.
3. Check the account balance/available funds through an authorised read-only balance endpoint; do not infer funds from ledger book balance alone.
4. Apply configured cut-off time, business-day calendar, amount threshold, duplicate window, daily aggregate cap and liquidity reserve.
5. Generate a payment proposal with an immutable digest and evidence bundle.
6. Obtain the required independent approvals.
7. Immediately before submission, revalidate mandate, beneficiary, amount, currency, account, schedule, limits, available funds and approval digest.
8. Submit exactly once using the provider's idempotency mechanism. Never blindly retry an ambiguous timeout.
9. Query provider status and reconcile settlement, return, reversal or rejection.
10. Post balanced ledger entries and preserve the mandate, approval, request, response and statement evidence references.

A mandate is not itself authority to change its amount, beneficiary or schedule. Material changes require renewed validation and approval. Returned or disputed debit orders enter an exception workflow; they are not automatically resubmitted.

## 4. Stablecoin execution workflow

- Use a regulated/contractually approved custodian or a documented corporate multisig. Do not place private keys, seed phrases or raw signing material in source control, ordinary environment files, logs or this chat.
- Maintain a chain-specific allowlist containing chain ID, token contract, decimals, issuer, asset status and review evidence.
- Bind each approval to chain ID, token contract, exact base-unit amount, recipient, fee ceiling, nonce/expiry and transaction calldata digest.
- Simulate the transaction and check token balance, allowance, fee/gas ceiling, recipient allowlist, sanctions screening evidence and chain health.
- Require separate approvers and a distinct execution identity. The execution service must reject altered, expired, replayed or wrong-chain approvals.
- Verify transaction receipt and required finality before marking settled. Reorgs and failed transactions create explicit compensating or exception records.
- Never assume a stablecoin is redeemable at par or that a token symbol identifies a unique asset.

## 5. Autonomous operation boundaries

Autonomy may:
- monitor bank/provider/chain events;
- calculate forecasts and due-date queues;
- prepare payment proposals;
- perform policy pre-checks and simulations;
- reconcile settled transactions;
- alert operators and open incidents;
- pause an adapter when a risk threshold or integrity check fails.

Autonomy may not, until a separate live execution policy is approved and enforced:
- create or amend debit mandates;
- add or change beneficiaries;
- alter payment amount, destination, currency or due date;
- approve its own proposal;
- bypass a failed check, expired approval or daily limit;
- retry an ambiguous payment submission;
- sweep, bridge, swap, lend, stake, redeem or withdraw funds outside an individually authorised workflow.

The VM is an execution host, not a source of authority. VM autonomy never overrides transaction policy.

## 6. Mandatory live controls

- Legal entity and authorised signatories verified against provider onboarding records.
- Provider contract, account ownership and API scopes reviewed.
- Mandates and beneficiaries independently verified.
- Per-transaction, daily, monthly and aggregate exposure limits set by an authorised officer.
- Maker/checker identities separated; no self-approval.
- Immutable approval digest and short expiry.
- Idempotency and duplicate detection at both request and provider layers.
- Dual control for new beneficiary, new chain, new token and limit increases.
- Circuit breaker and emergency stop for each payment adapter.
- Daily reconciliation and ageing of unresolved exceptions.
- Append-only audit records, secure backups and tested restoration.
- Secrets stored in a managed secret store with least privilege, rotation and access audit.
- No production secrets in GitHub, tickets, logs or chat.

## 7. Virtual machine deployment requirements

A dedicated isolated VM may host the monitor, policy, reconciliation and API services. Before provisioning:
- select the cloud account/project and region with the authorised owner;
- confirm billing, resource limits and budget alert;
- choose a supported OS image and minimum required size;
- restrict inbound access, use key-based administration and private networking where available;
- configure host firewall, automatic security updates, encrypted backups and central monitoring;
- store provider credentials in a managed secret store, not in repository files;
- deploy a non-privileged monitor identity first;
- keep the execution adapter absent or disabled until provider and approval gates pass;
- perform vulnerability, recovery and access-control checks before production traffic.

Current DigitalOcean inspection returned zero droplets and an account warning stating the droplet limit had been reached. No VM was created. Resolve the account limit and confirm the budget before provisioning. The registered Desktop Commander devices were both offline, so no local host deployment was possible during this inspection.

## 8. Required integrations and current gaps

| Dependency | Required evidence | Current result |
|---|---|---|
| Corporate bank | Legal entity account ownership and approved API/payment product | Not verified |
| Debit-order provider | Mandate API, debit-order authority, return/reversal handling, idempotency | Not verified |
| Stablecoin custodian/signing | Corporate ownership, signing policy, API scopes, recovery and audit | Not verified |
| Off-ramp/redemption | Provider onboarding, supported assets/chains/currencies, settlement terms | Not verified |
| Database | Approved project, migrations, RLS, backups and restore evidence | No Supabase project found |
| VM | Approved cloud budget, account capacity, region and hardening | No droplet; account limit warning |
| Wallet inventory | Public address, chain, legal owner and custody model | Not supplied |
| Asset registry | Verified chain-specific token contracts and review evidence | Empty allowlist |
| Compliance | Jurisdiction-specific legal/compliance sign-off | Outstanding |

## 9. Production acceptance gates

Production execution remains disabled until all gates are evidenced:
1. Corporate entity, ownership and authorised signatories verified.
2. Bank/debit-order and custody/off-ramp providers formally connected and tested read-only.
3. Legal/compliance assessment completed for South Africa and every relevant cross-border jurisdiction.
4. Database and VM deployed, hardened, backed up and recovery-tested.
5. Token/chain/beneficiary allowlists independently reviewed.
6. Unit, integration, security, failure-injection and reconciliation tests pass.
7. Sandbox end-to-end debit-order and stablecoin lifecycle tests pass, including timeout, duplicate, return, reversal, reorg and provider outage cases.
8. Transaction limits, approval quorum, emergency stop and incident contacts are configured.
9. An authorised officer explicitly approves enabling each individual production adapter.
10. A separate transaction-specific approval authorises each live payment or transfer.

No production transaction is authorised by this design document or by enabling monitoring. No funds have been moved by this work.

## 10. Immediate next actions

- Confirm the legal entity name and the authorised treasury signatory role (do not send identity documents or account credentials in chat).
- Identify the corporate bank and debit-order/payment provider to be integrated.
- Identify the approved corporate custody model and supply only public wallet addresses for watch-only inventory.
- Resolve the cloud account droplet limit and approve a VM budget.
- Select an approved database provider/project.
- Obtain legal/compliance sign-off and set initial transaction limits.

**Current state:** design extension only. Live bank rails, debit-order initiation, custody, signing, off-ramp and production transaction execution remain disabled pending the acceptance gates above.
