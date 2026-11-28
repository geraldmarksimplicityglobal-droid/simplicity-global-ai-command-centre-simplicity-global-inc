# SG-FIN-ROUTE-001 — Financial Routing Operational Specification

**Parent:** SG-AIF-001  
**Financial foundation:** SG-FIN-001  
**Banking registry:** SG-BANKING-INFRA-001  
**Status:** specification; no live payment connector or execution mandate activated  
**Production autonomy:** L3 maximum  
**Sandbox autonomy:** L5 simulation only

## 1. Purpose and governing rule

Financial routing is the selection and orchestration of where money, value, payment instructions, liquidity and financial evidence flow. It includes payment rails, PSP/acquirer selection, bank/account routing, FX, treasury, AP/AR, clearing, settlement, risk/compliance queues and AI operating expenditure.

The AI may select among eligible routes within a human-granted mandate. It cannot create authority to move funds, set or raise limits, add counterparties, change beneficiary details, add rails/corridors, waive screening or bypass approvals.

This subsystem has a stricter authority boundary than general SG-AIF autonomy. Current production posture is read-only/recommendation/instruction-preparation, with transaction-specific human approval required before any real-money movement.

## 2. Routing classes

- **Payment:** card network/PSP/acquirer; ACH, SEPA, wire, instant and local rails; cross-border corridor; decline retry/fallback; fee- or success-aware routing.
- **Treasury/liquidity:** account balance allocation, cash sweep proposals, FX conversion, intercompany transfer proposals, short-term placement and multi-bank liquidity.
- **AP/AR:** invoice-to-approval workflow, vendor payment method recommendation, collections/dunning, refund and chargeback case routing.
- **Clearing/settlement:** clearing-house eligibility, settlement window, netting/offset and nostro/vostro evidence.
- **Risk/compliance:** fraud queue, AML/sanctions/PEP investigation, KYC exceptions and dispute handling.
- **AI expenditure:** model/provider, cloud job and vendor API cost routing. This is spend optimization, not money movement; budget changes remain approval-controlled.

## 3. Decision factors and selection

### Hard gates — pass/fail, never weighted
- Valid mandate, transaction cap and velocity limits.
- Beneficiary/counterparty allowlist and verified bank details.
- Rail, currency, amount, entity and corridor eligibility.
- Sanctions/AML and required KYC/fraud screening.
- Jurisdiction, data residency, tax/reporting and provider-contract rules.
- Liquidity/reservation requirements and approval status.
- Kill-switch/freeze state and duplicate/idempotency check.

A failed, missing, stale or indeterminate blocking check must fail closed and create an exception. A sanctions or AML hit is not an AI override decision; route it to an authorized investigator.

### Optimization among eligible routes
Evaluate interchange and rail fees; FX spread/markup; settlement float and manual handling cost; historical approval/success and retry recovery; uptime and latency; corridor/BIN/currency performance; settlement timing/cut-offs/holidays; liquidity; and counterparty contract preferences.

Illustrative model:
`score = wc*cost_efficiency + ws*success_probability + wl*latency_efficiency - wr*operational_risk`
Weights are finance/risk-approved, versioned and tested. Compliance is excluded from scoring. Tie-break by lowest risk, then lowest total cost, then highest evidenced success. Scores are recommendations, not authority.

## 4. Rail reference matrix

| Rail | Typical characteristics | Design ceiling |
|---|---|---|
| Card/PSP/acquirer | Authorization response; chargeback/dispute process; higher variable fees | L3; L4 only after separate mandate review |
| ACH | Domestic batch, often T+1/T+2; returns possible | L3 |
| SEPA / SEPA Instant | European credit transfer schemes; availability and finality differ | L3; L4 only after mandate review |
| SWIFT / wire | Cross-border, correspondent chain, cut-offs and higher fees; recalls not guaranteed | L2–L3, dual control |
| RTP / FedNow / FPS | Domestic instant schemes; limited reversibility | L3 with strict caps |
| Open Banking PIS | Account-to-account initiation; jurisdiction/provider dependent | L3; L4 only after mandate review |
| PIX / UPI / PayID | Local scheme-specific instant rails | L3; L4 only after mandate review |
| Internal on-us ledger | Same-entity book transfer, subject to ledger controls | L4 candidate, separately approved |
| FX venue | Market execution, T+0–T+2 depending instrument/venue | L2–L3 |
| Stablecoin/on-chain | Network, custody, key, finality and compliance risks | L1–L2; human approval; no live autonomous signing |

Irreversible + high-value + cross-border transactions require the lowest practical autonomy and independent dual control. Rail characteristics must be verified against actual scheme rules and provider contracts; this table is not a universal settlement guarantee.

## 5. FX controls

Record executable/indicative quote type, provider, venue, timestamp, expiry, currency pair, bid/ask, spread/markup, slippage and benchmark. Reject stale/expired quotes, unauthorized venues, out-of-band rates and slippage beyond a human-approved guardband. Check exposure and liquidity before conversion. Netting, hedging and timing recommendations require approved policy; the AI cannot execute an FX trade or transfer funds without the required transaction authorization.

## 6. Decision workflow

1. Validate request identity, purpose, payee, amount, currency, entity and corridor.
2. Verify beneficiary against trusted master data; bank-detail changes require out-of-band callback and dual approval.
3. Run blocking sanctions/AML/KYC/fraud checks.
4. Validate mandate, amount/velocity caps, rail/corridor allowlists and jurisdiction.
5. Check liquidity, settlement windows and quote freshness.
6. Build eligible candidate set from allowlisted rails only.
7. Score eligible candidates; record rejected candidates and reasons.
8. Prepare instruction and evidence package.
9. Require approval/dual control according to policy. Current production policy requires explicit human authorization before any real-money movement.
10. Connector independently revalidates every control before submission.
11. Record provider response/reference; do not equate accepted/submitted with settled.
12. Reconcile provider/bank evidence to the ledger; unmatched items remain exceptions.

Stop conditions: screening hit/unknown; limit or mandate breach; empty eligible set; duplicate suspicion; stale FX; slippage breach; repeated declines; provider outage without an approved fallback; reconciliation mismatch; freeze/kill switch; approval expiry or revocation.

## 7. Data and evidence model

Each routing decision records:
- decision_id, request_id, correlation_id, timestamp, environment, actor and policy version;
- legal entity, amount in integer minor units, ISO-4217 currency, source currency, corridor and protected payee reference;
- candidate rails with eligibility, rejection reason, fee, FX, success estimate, latency and evidence timestamps;
- hard-gate outcomes and screening case references;
- selected rail and concise audit rationale referencing input evidence and scoring version;
- FX quote/venue/source/timestamp/expiry/slippage;
- approval request, distinct maker/checker identities, decision, timestamps and expiry;
- idempotency key, connector identity, scoped connection reference, provider transaction reference and lifecycle status;
- bank/ledger reconciliation status, matched timestamp, variance and exception owner;
- audit integrity hash and retention classification.

Never store API keys, passwords, private keys, seed phrases, full card data or unnecessary bank account details in routing records or logs. Use tokenized references and managed secrets. Amount calculations use exact decimal/integer minor-unit arithmetic, never binary floating point.

## 8. Approval and mandate policy

The following are illustrative tiers only, not configured SG transaction limits:

| Tier | Example amount | Approval example |
|---|---:|---|
| T0 | Below USD 1,000 | Could qualify for mandate automation only after separate approval |
| T1 | USD 1,000–10,000 | Mandate + post-audit sample |
| T2 | USD 10,000–100,000 | Authorized single approver |
| T3 | USD 100,000–1,000,000 | Maker–checker |
| T4 | Above USD 1,000,000 | Maker–checker + treasury sign-off |
| New payee | Any amount | Human verification / out-of-band callback |
| Bank detail change | Any amount | Dual approval and independent verification |

Actual thresholds must be set by authorized finance/risk governance for each legal entity, currency, corridor and rail. Until populated and approved, caps are unset and execution is disabled. No agent may set, infer, increase or relax them. Current policy requires explicit transaction approval for every live movement, regardless of illustrative tier.

## 9. Idempotency and connector contract

Use durable idempotency keys scoped to provider, operation and business request. Persist request state before submission. Verify status before retrying ambiguous/timeout outcomes. Deduplicate signed webhooks and use provider references plus reconciliation. Do not claim exactly-once transport across external networks; implement effectively-once business processing.

Separate operations:
- `payments.prepare_route`: validates and returns a recommendation/draft only; no funds move.
- `payments.execute_approved`: future connector operation; requires a valid approval reference and independently verifies mandate, beneficiary, amount, rail, corridor, screening, limits, idempotency, freeze status and scoped credentials.

The connector must enforce policy independently of the AI-supplied arguments. No silent fallback to a non-allowlisted rail. Unresolved or irreversible outcomes go to a dead-letter/exception queue, not blind retry.

## 10. Reconciliation runbook

### Real-time
- Verify webhook signature and replay protection.
- Query provider status where appropriate.
- Match transaction reference, amount, currency, beneficiary token, value date and fees.
- Link evidence to ledger candidate; human confirmation remains required for accounting acceptance.
- Flag mismatches within the configured SLA.

### Daily
- Match bank statement/feed, provider settlement report and ledger.
- Report matched, unmatched, duplicate, returned, pending, fee and FX variance populations.
- Assign exception owners and age unresolved items.
- Require finance sign-off; retain source files and evidence hashes.

### Exceptions
- Stuck/pending: query authoritative status; no blind retry.
- Duplicate suspected: freeze affected route, investigate, recall/refund only through separately authorized procedure.
- Amount/currency/payee mismatch: hold workflow and escalate.
- Returned/recalled: reconcile return evidence and prepare a human-reviewed reroute/credit proposal.
- Unmatched settlement: treasury investigation; no forced journal posting.

Proposed targets: P1 funds-at-risk escalation within 15 minutes; P2 failed payment/connector issue within 1 hour; P3 routine variance by next business day. These are target SLAs, not active commitments.

## 11. Controls and monitoring

Always-on: least privilege; short-lived per-rail credentials; allowlists; blocking screening; durable idempotency; rate/time/retry/budget caps; signed webhooks; immutable-target audit; reconciliation; freeze/kill switch.

L2+: dry-run and simulation; human executes final instruction.

L3+: amount/velocity caps; approval queue; maker–checker above approved thresholds; exception queue; DLP and redaction.

L4 future-only: explicit mandate, continuous anomaly monitoring, daily reconciliation sign-off, shadow/canary evidence and periodic human audit.

L5: sandbox ledger only, no live rails or money movement, red-team and stop-condition verification.

KPIs: straight-through processing; first-attempt success by rail; settlement latency; retry rate/recovery; effective fee bps; FX spread vs benchmark; manual handling; screening false-positive rate; exception rate; blocked limit-breach attempts; audit completeness; connector uptime; reconciliation match rate; mismatch detection time; freeze activation latency.

Targets must be established from measured baselines and approved by finance/risk.

## 12. Testing and red-team

Unit-test scoring, gates, decimal arithmetic, limits and duplicate detection. Integration-test each provider sandbox, idempotency and webhook verification. Replay historical data in simulation. Adversarially test beneficiary substitution/BEC, prompt injection, sanctions evasion, limit splitting, stale FX, hidden fees, compromised credentials, duplicate callbacks, connector outage, silent fallback, runaway retries, deadlocks and reconciliation tampering.

Acceptance gates: zero hard-gate bypasses in simulation; zero unapproved live sends in any separately authorized canary; duplicate replay safely handled; reconciliation exceptions detected; freeze and rollback independently tested; evidence retained. Shadow mode must not submit transactions.

## 13. Rollout stages

1. Read-only observation and route recommendations.
2. Shadow routing; human makes and executes decision.
3. Assisted instruction preparation; human executes.
4. Capped live only after separate explicit financial mandate and production approval.
5. Mandated operation only after separate L4 review; outside current profile.
6. Steady-state audit, red-team, recertification and incident exercises.

Every stage requires exit criteria, rollback triggers, named owner and sign-off. Current work is limited to design/read-only discovery; no live stage is activated.

## 14. Incident playbooks

- **Misdirected/fraudulent payment:** freeze affected rail/agent; notify bank/provider and risk/finance; attempt recall through authorized channel; preserve evidence; investigate root cause.
- **Duplicate burst:** stop submissions; audit idempotency and provider references; reconcile full population; pursue recovery only with authorization.
- **Connector outage:** circuit-break and queue; use only pre-approved fallback; otherwise escalate.
- **Prompt injection/BEC:** block payee change; require out-of-band verification; quarantine compromised session/plugin; rotate/revoke affected credentials.
- **Reconciliation variance:** isolate affected items, preserve evidence, assign owner and prevent silent closure.

Every incident records timeline, impact, containment, notification, corrective action, control update, evidence and closure approval.

## 15. Jurisdiction overlay

Maintain versioned jurisdiction/corridor rules with effective dates and legal owner. Research applicability for US BSA/AML, OFAC, Reg E, NACHA and state money-transmission; EU/UK payment-services, SEPA, AML, FCA and GDPR; card PCI DSS and network rules; cross-border SWIFT/FATF; and local tax, data-residency and reporting rules.

For South Africa, obtain qualified review of applicable SARB, FIC, National Payment System, POPIA, exchange-control and provider-specific requirements. This specification is not legal advice or a conclusion that a particular licence is or is not required. AI cannot waive a jurisdiction gate.

## 16. Integration patterns

Use synchronous APIs only where provider behavior supports it; asynchronous events/webhooks for settlement; transactional outbox for durable events; idempotency for every submission; signed webhook verification and replay protection; per-connector circuit breakers; dead-letter queues; correlation IDs across decision/execution/reconciliation; and segregated scoped credentials.

## 17. RACI

| Activity | Responsible | Accountable |
|---|---|---|
| Mandate/limits | Finance | Authorized finance authority |
| Route recommendation | AI agent | Financial governance owner |
| High-value approval | Independent approver(s) | Treasury authority |
| Sanctions investigation | Compliance investigator | Risk/compliance authority |
| Reconciliation | Reconciliation process + finance reviewer | Finance |
| Incident response | Incident team | Risk/finance incident owner |
| Freeze release | Independent authorized operators | Financial authority |
| Audit evidence | Audit system/operator | Audit function |

Maker, checker and execution identities must be distinct where policy requires. AI is never accountable for legal authorization.

## 18. Service inventory and lifecycle

Register PSP/acquirer, bank connectivity, payment rails, FX, TMS, ERP/AP/AR, ledger, sanctions/AML, fraud, KYC, reconciliation, disputes, immutable audit, approval workflow, mandate service and freeze service in SG-CSR-001.

For each connection record provider, legal entity, environment, owner, connection ownership, auth type, scopes, credential reference (never secret), egress allowlist, data classification, lifecycle state, last verification, read/write/send/delete/admin capabilities and approval requirements.

A tool being available in ChatGPT is not proof of provider account connection, production authority or transaction capability.

## 19. Current readiness and explicit exclusions

- Xero organisation is connected in ChatGPT; this does not establish a separate application OAuth connector or write permission. Xero remains the accounting system of record.
- Stripe account discovered in test mode only; no live-mode authority established.
- Supabase organization exists but no projects were returned.
- No DigitalOcean Droplets were returned.
- GERALD-PC Remote Arc device was offline at last inspection.
- Nedbank, Capitec, TymeBank, Wise and EasyEquities provider connections were not verified in this inspection.
- Existing SG-FIN-001 feature branch contains read-only financial intelligence foundations; its draft PR remains separate and unmerged.
- Existing SG-STABLECOIN-CASH-001 proposal is sandbox-only and blocks live transfer/signing/broadcast.

Explicitly excluded absent separate approval: bank/PSP writes, payments, transfers, FX execution, stablecoin/crypto movement, wallet signing, new payees, bank-detail changes, journal posting, invoice sending, account creation, DNS changes, database provisioning, paid infrastructure and production deployment.

## 20. Acceptance checklist

- [ ] Every transaction request has a stable request and correlation ID.
- [ ] Hard gates are independent of AI scoring.
- [ ] Amounts use exact decimal/minor-unit arithmetic.
- [ ] Beneficiary and bank-detail changes are independently verified.
- [ ] Mandates and caps are human-set, versioned and fail closed when unset.
- [ ] Dual control is enforced for configured tiers.
- [ ] Every connector independently checks authorization and idempotency.
- [ ] No blind retry or unapproved fallback exists.
- [ ] Provider acceptance is distinguished from settlement.
- [ ] Reconciliation and exception queues are operationally owned.
- [ ] Audit evidence spans decision, approval, connector and settlement.
- [ ] Freeze, rollback and incident playbooks are tested.
- [ ] Jurisdiction and legal reviews are signed off.
- [ ] Separate production and financial execution approval is recorded.

**Current disposition:** architecture and operating specification complete; source integration is a draft feature-branch change; live banking and payment execution remain disabled/not authorized.
