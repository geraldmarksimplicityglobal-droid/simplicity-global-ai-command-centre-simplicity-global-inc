# SG-FIN-ROUTE-001 — Parts III–V implementation pack

**Status: implementation templates and policy tests; no provider connection or money movement.**
This pack extends the persistent SG-AIF runtime on the preceding branch. It is deliberately isolated from production execution.

## Safety profile

- Production autonomy remains capped at L3.3; L5.4 is sandbox-only.
- The current financial route table still enforces `execution_allowed = false` and `selected_route IS NULL`.
- No bank, PSP, exchange, wallet, FX, or payment rail credentials are requested or stored.
- Self-custody wallets (OneKey and Trust Wallet) are preparation-only; AI signing and broadcasting are prohibited.
- Provider rows describe intended integration profiles, not verified live access or provider capability.
- All provider endpoints, scopes, message formats, limits, certification and legal requirements require current official-document verification and contractual onboarding before integration.
- No external send adapter is implemented in this pack.

## Package map

- `policy/mandate.rego`: deny-by-default mandate evaluation and approval requirements.
- `policy/crypto.rego`: asset/chain/address/memo/travel-rule/self-custody gates.
- `policy/data/mandate.example.json`: non-production example policy data; placeholder values only.
- `policy/tests/mandate_test.rego`: adversarial policy fixtures.
- `runtime/connector-contract.mjs`: pure validation helpers for decision binding, idempotency and unknown-state handling.
- `runtime/connector-contract.test.mjs`: Node built-in tests.
- `certification/rail-certification.mjs`: offline test-case catalogue and evidence summary helper; does not connect to rails.
- `providers/provider-inventory.yaml`: proposed provider inventory with unverified status.
- `runbooks/RAIL-INTEGRATION-RUNBOOKS.md`: adapter checklists and provider-specific onboarding gates.
- `governance/CONTROL-AND-RESILIENCE.md`: controls for agents, credentials, ledger, reconciliation, model risk, BEC, DR, change and reporting.

## How to verify locally

Requirements: Node.js 20+ and OPA 1.x.

```sh
node --test live-framework/FINANCIAL-ROUTING/PART-III-V/runtime/connector-contract.test.mjs
opa test live-framework/FINANCIAL-ROUTING/PART-III-V/policy -v
```

These tests are offline policy/contract tests. They do not certify a provider sandbox, validate a bank integration, or authorize a live transfer.

## Activation sequence

1. Finance and Risk approve a versioned mandate and provider inventory.
2. Security provisions per-connector workload identity and HSM/vault-backed credentials outside model context.
3. Provider contracts, sandbox credentials and official API specifications are independently verified.
4. Each connector implements the common contract and completes its rail-specific certification matrix.
5. Independent Risk validates model/policy behavior and adversarial tests.
6. Finance, Risk, Security and Audit sign the evidence pack.
7. Only a separately approved deployment can enable any live capability; no approval in this repository changes the existing database-level execution block.

## Important integration boundary

The Rego policy is an evaluation artifact, not a substitute for a trusted policy service. The production connector must independently verify the signed, single-use approval token, bound intent hash, active policy version, identity, mandate, amount, currency, rail, payee and expiry. Policy-engine unavailability must fail closed. A model must never mint approval tokens or modify policy data.
