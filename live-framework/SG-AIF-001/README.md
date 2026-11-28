# SG-AIF-001 — Simplicity Global Autonomous Intelligence

**Specification:** 1.0.0  
**Status:** architecture baseline; implementation and deployment are separate gates  
**Strategy:** controlled  
**Sandbox maximum:** L5.4, isolated simulation only  
**Production maximum:** L3.3, bounded and policy-enforced  
**Purpose authority:** human-owned  
**Permission and guardrail authority:** human-owned

## 1. Governing principle

> Self-driven in execution, never self-originating in purpose.

An agent may plan, decompose, schedule, delegate, execute, verify, recover and optimize within an approved objective and mandate. It may not originate its own mission, grant itself permissions, add counterparties, raise limits, change its authority, or remove controls.

## 2. Autonomy spectrum

| Level | Sublevels | Meaning |
|---|---|---|
| L0 Manual | L0.0, L0.1 | Human performs work; AI answers or drafts |
| L1 Assisted | L1.1–L1.3 | Suggestions, prefill and anomaly flags |
| L2 Partial automation | L2.1–L2.3 | Read-only work, reversible writes, or approval-gated writes |
| L3 Conditional autonomy | L3.1–L3.3 | Bounded workflows with dashboard, sensitive-step or exception oversight |
| L4 High autonomy | L4.1–L4.4 | Policy-bounded tool chaining, replanning, delegation and tuning |
| L5 Bounded operational autonomy | L5.1–L5.4 | End-to-end isolated sandbox execution, persistence and scheduling within an approved objective queue |

L5 never permits self-set goals, permission escalation or guardrail removal. Production is capped at L3.3. Financial execution is subject to stricter subsystem-specific limits.

## 3. Self-capability groups

- **Perception and awareness:** monitor state/confidence/latency/cost; diagnose errors; identify environment and tool; report capability limits.
- **Correction and resilience:** correct, verify, critique, heal, rollback and quarantine after repeated risky failures.
- **Learning and adaptation:** feedback-driven learning, bounded tuning, distillation, benchmarking and supervised curriculum selection.
- **Orchestration and action:** plan, replan, sequence tools, delegate within quotas, schedule approved work and configure task-specific parameters.
- **Protection and governance:** refuse out-of-scope actions, stop at policy boundaries, redact sensitive data, explain decisions, report uncertainty. Expansion requires an explicit human grant.

Learning must not silently change production policy, financial mandates, identity privileges or safety limits.

## 4. Agent catalogue

Agent roles include orchestrator/coordinator, planner, router/dispatcher, worker/executor, critic/verifier, memory keeper, researcher, security, infrastructure, finance/reconciliation and human supervisor.

Agent implementation patterns may include rule-based/RPA, workflow/DAG, state-machine, reactive, deliberative, hybrid, BDI-inspired, ReAct, Reflexion, plan-and-execute, tree search, debate and critic–actor. These are execution patterns, not independent authorization authorities.

Physical specializations include software/API agents, robotics, vehicles, drones and industrial/IoT agents. Domain specializations include coding, research, cybersecurity, support, CRM, finance, healthcare, legal, scientific and personal assistance.

## 5. Nine-layer architecture

1. **Input:** sensors, events, webhooks, documents, APIs and user requests.
2. **Perception:** parsing, OCR, speech recognition, entity extraction and intent classification.
3. **Memory:** working, episodic, semantic, procedural and governed long-term storage.
4. **Reasoning:** planner, decomposer, tool selector, policy pre-check and optional world model.
5. **Action:** plugin/API calls, code execution, message preparation and connection manager.
6. **Reflection:** verifier, critic, tests and confidence assessment.
7. **Governance:** permission engine, approvals, rate limits, DLP, egress allowlist, kill switch and human override.
8. **Observability:** logs, traces, metrics, audit ledger and cost accounting.
9. **Platform:** runtime, queues, scheduler, secrets, configuration and deployment.

The governance plane must be independent of agent reasoning and action. The agent that proposes an action cannot approve its own privileged action.

## 6. Domain ceilings

Default design ceilings, subject to stricter law, licensing, provider terms and safety requirements:

- Software: code generation L3–L4 with PR approval; testing L4; CI/CD gated.
- Business operations: ticket routing/reporting L4; CRM changes and procurement approval-gated.
- Finance: fraud detection L4; trading no higher than L2; money movement separately governed by SG-FIN-ROUTE-001.
- Healthcare: triage and imaging assistance L2; documentation L3; clinical diagnosis/treatment decisions remain with qualified clinicians.
- Transport/manufacturing: L4–L5 only in certified, geo-fenced or cell-bounded safety envelopes.
- Security: SOC triage L4; containment approval-gated; no unrestricted offensive action.
- Research: literature and data analysis L4; experiments and lab actions safety-gated.
- Personal: routine triage L3–L4; purchases, payments and sensitive actions require authorization.

## 7. Failure modes

Monitor reasoning failures (hallucination, overconfidence, goal drift, spec gaming, reward hacking and misgeneralization); action failures (wrong tool/parameters, runaway loops, cost blowups, irreversible writes and exfiltration); security failures (prompt injection, credential sprawl, compromised supply chain and unlogged egress); coordination failures (deadlock, infinite delegation, collusion and critic–actor collapse); governance failures (approval fatigue, alert flooding, audit gaps and untested kill switch); and physical failures (sensor blind spots, edge-case misclassification and unsafe fallback).

## 8. Controls by autonomy level

**Always on:** least privilege; per-tool scoped credentials; short-lived tokens and rotation; egress allowlists; network segmentation; call and connection audit; timeouts; retry/rate/budget caps; output sanitization; injection defenses; kill switch and human override.

**L2+:** dry run and reversible-by-default operations with undo where technically possible.

**L3+:** policy engine, approval queue for write/send/delete/pay, DLP and pre-egress redaction.

**L4+:** sub-agent quotas, budget caps, behavioral anomaly detection, shadow/canary testing and human audit sampling.

**L5:** isolated execution cell, continuous adversarial testing, verified stop conditions, named safety/liability owner and regulatory evidence where applicable.

## 9. Maturity ladder

- M0 Ad hoc.
- M1 Tool-aware.
- M2 Tool-chaining.
- M3 Bounded agent with policy, approvals and audit.
- M4 Supervised end-to-end autonomy.
- M5 Governed multi-agent autonomy with self-healing, red-team evidence and audit.
- M6 self-originating goals or self-escalation is explicitly out of scope.

Autonomy level and maturity are independent dimensions. A sandbox L5 agent may still be immature.

## 10. Financial boundary

SG-FIN-ROUTE-001 is the dedicated financial routing subsystem. Its stricter controls override general agent autonomy. In the current profile, production is L3 maximum and real money movement requires explicit human transaction authorization. No AI may raise financial limits, add payees, change bank details, select unapproved rails or bypass dual control.

## 11. Inventory contract

Every system/agent record must identify: stable ID and owner; autonomy sublevel; maturity; agent type and reasoning pattern; capabilities; architecture layers; services and connection ownership; permission scopes; approval gates; guardrails; watched failure modes; audit and retention; human override and response target; token/currency/time budgets; environment; lifecycle state; evidence timestamp; and deployment status.

Use explicit states such as proposed, source-foundation, available, installed, authenticated, connected, verified, offline, revoked and not-verified. Do not infer a live connection from plugin catalogue presence.

## 12. Release and deployment gates

1. Inspect existing systems and preserve branches, plugins, records and integrations.
2. Specify interfaces and policy contracts.
3. Implement in an isolated branch and environment.
4. Test policy boundaries, failure paths and rollback.
5. Review security, privacy, compliance, cost and ownership.
6. Obtain separate approval for staging and production.
7. Verify deployment and monitor with evidence.

No production deployment, DNS change, real email send, account creation, paid provisioning, permission escalation or financial execution is authorized by this architecture document.
