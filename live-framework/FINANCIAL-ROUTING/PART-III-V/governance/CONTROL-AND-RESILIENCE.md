# Financial routing — Part III governance controls

## Multi-agent separation of duties

| Role | Allowed | Prohibited |
|---|---|---|
| Intake | Normalize and validate request | Approval, send, credential access |
| Screening | Block, flag, create investigation | Approve, clear own alert, send |
| Router | Score eligible routes and propose | Change mandate, approve, execute |
| Executor | Invoke approved connector operation | Choose payee/rail outside signed decision |
| Reconciler | Read bank/PSP/chain feeds; create breaks | Mutate ledger or approve payment |
| Auditor | Read immutable evidence | Operational action or state mutation |

Proposer, approver and executor must be distinct identities. No identity may combine unrestricted read-all and send rights. Signed inter-agent envelopes bind workload identity, trace ID, intent hash, policy version and attenuated capability. Lease/quorum prevents split-brain execution. Crashes and ambiguous states fail safe.

## Credential and cryptographic controls

Use a private CA hierarchy and HSM-backed non-exportable signing keys where provider and infrastructure support it. Issue short-lived per-environment, per-connector workload identities. Use SPIFFE/SPIRE or equivalent only after security design and deployment validation. Secrets are injected at connector boundary from a managed vault, never into prompts, logs, source files or model-visible tools. Rotation, revocation, emergency response and break-glass are tested. Break-glass requires dual custody, alerting and retrospective review.

Do not treat example rotation periods or TLS features as universal provider requirements. Set exact schedules from provider contracts, cryptographic policy and risk review.

## Message and API security

- Validate ISO 20022 schemas against the exact scheme/profile version used by the counterparty.
- Validate required parties, amount, currency, identifiers, purpose/remittance codes, character set and structured address requirements against current scheme rules.
- Track UETR or scheme-specific end-to-end identifiers where applicable.
- Sign requests and verify webhook signatures before parsing; enforce timestamps, nonce/replay windows and event dedupe.
- TLS configuration follows current security policy and provider support; certificate pinning is only used with a safe rotation strategy.
- A webhook is a signal, not authority to settle or execute. Re-query authoritative state.

## Payment state machine and exactly-once business processing

Persist intent, outbox item, idempotency key and ledger reservation atomically. Use one writer lease per intent and account/payee concurrency controls. Deduplicate on internal idempotency key, provider reference, webhook event ID and UETR where available.

The state UNKNOWN is query-only and terminal for automation: no resend. A timeout after request transmission is ambiguous, not a failure. Use status inquiry and manual exception resolution. Exactly-once delivery across independent rails is not assumed; target effectively-once business processing using idempotency, durable outbox, dedupe and reconciliation.

## Ledger and event sourcing

Use balanced double-entry postings; every external movement requires a verified provider execution reference. Keep suspense for unmatched entries. Events are append-only and hash-linked; corrections are new reversal/adjustment events, never mutation of history. Version posting rules and require independent dual approval. Snapshots accelerate reads but event history remains authoritative. Period close locks posting and produces signed reconciliation evidence.

## Reconciliation

Support two-way ledger-to-bank, three-way ledger/bank/PSP and four-way ledger/bank/PSP/ERP matching. Prioritize exact UETR/provider reference, then end-to-end ID plus amount/currency, then amount/value-date/counterparty, then constrained fuzzy matching. Fuzzy matches only suggest; they do not silently clear a break.

Break types: timing, amount/fee, missing, duplicate, counterparty, currency, reference/data, chain confirmation/finality, address mismatch, reorg and travel-rule hold. Auto-age timing breaks only within a human-approved window. Fee auto-posting is permitted only within a versioned tolerance and approved posting rule. All other breaks enter a named exception queue. Age buckets and escalation thresholds are policy data, not hardcoded model choices.

## Model risk and explainability

Inventory each routing model with purpose, owner, intended use, prohibited use, tier, data lineage, validation evidence, limits and version. Financial routing is Tier 1 impact. Require independent pre-live validation, periodic and incident-triggered revalidation, drift monitoring, challenger/shadow comparisons and documented rollback.

Decision rationale must be generated from actual gates and scoring inputs: candidate, eligibility, factors, values, weights, policy version and decision ID. The LLM may summarize the structured record but cannot invent factors or overwrite it. Apply retention only after jurisdiction/privacy/legal review; seven years is not a universal default.

## BEC, fraud and prompt injection

Treat invoices, email, RAG records, plugins, webhooks and tool output as untrusted data, never instructions. Bank details are sourced only from a verified vendor master record. New/changed payees require out-of-band callback to a previously verified contact, cooling period and dual approval. Detect name mismatch, vendor-history deviation, corridor/currency anomaly, velocity spikes, threshold-hugging, email-domain/reply-to mismatch and approver device/session anomalies.

No model output can directly alter a beneficiary record. No shell/browser capability in payment execution path. Detect transaction splitting using aggregate amount/count limits across payee, account, currency, corridor and time windows.

## Disputes and third parties

Track inquiry, return/chargeback, representment, arbitration and write-off deadlines from current network/provider rules. AI may classify and assemble immutable evidence; human approval owns representment and filing. Maintain provider due diligence: licensing, financial condition, SOC/ISO/PCI evidence where relevant, resilience, incident history, data residency, subprocessors, audit rights, breach notification and exit/portability. Monitor concentration and test certified fallback quarterly.

## DR/BCP, change and operations

RTO/RPO values must be approved per service and data classification; examples in design notes are targets, not commitments. Replicate ledger safely, preserve outbox replay and dedupe on failover, and test kill switch in every region. Run quarterly sandbox failover and connector/database/webhook-backlog chaos drills.

Model/prompt changes require validation, shadow and canary. Limit changes require dual approval and effective dating. Credential changes require security review and rotation test. Schema changes require contract tests and rollback/backout plan. Use code/config review with Risk participation, immutable deployment evidence and change freezes around close/peak windows.

## Observability and internal controls

Trace request → decision → approval → connector → rail → webhook → ledger → reconciliation. Emit structured redacted logs, metrics and trace spans. Dashboards cover operations, risk, finance and cost. Page on funds-at-risk, kill-switch failures and critical reconciliation breaks; deduplicate alerts and link runbooks.

Control catalog includes ITGC access, change, operations, backup/restore and business controls for approval, screening, limits and reconciliation. Test key controls quarterly and full population where automatable. Track deficiency owner, remediation date, retest and control-owner attestation. These controls support audit readiness but do not establish SOX applicability or certification.

## Evaluation and human factors

Maintain golden, synthetic and adversarial sets. Gate compliance, idempotency, self-custody restrictions and prompt-injection resistance are hard pass/fail gates (100%); averages cannot mask a single bypass. Benchmark routing quality, cost, success, latency and false-positive rates against a validated baseline. Run weekly regression and revalidate on material drift.

Approval UI must show verified payee, amount, currency, corridor, rail, fees, rationale, policy version and risk flags. Use named identities, per-item approval, expiry and escalation. Monitor approval latency, override rate and rubber-stamping. Never provide approve-all for high-risk payment batches.

## Regulatory reporting

AI may prepare draft SAR/STR, large-transaction, travel-rule, payment-statistics, incident and model-inventory evidence where lawful. Authorized humans review, approve and file. Track jurisdiction-specific deadlines and preserve source lineage. Do not claim that a report has been filed unless the competent authority receipt is recorded.
