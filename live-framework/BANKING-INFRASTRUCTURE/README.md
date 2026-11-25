# SG-BANKING-INFRA-001 — Banking Infrastructure & Connectivity Registry

**Parent:** GEN SYSTEM  
**Financial control plane:** SG-FIN-001 Financial Intelligence System  
**Platform classification:** SG-BANKING-INFRA-012 — Simplicity Global Banking Connectivity & Orchestration  
**Status:** taxonomy and source registry; not a licensed bank, payment rail or live banking network

## 1. Architectural position

Simplicity Global is represented as a named platform, aggregator and integration/orchestration layer. It is not itself a payment rail. Provider, bank, payment scheme and regulatory capabilities must be verified independently before being described as operational.

```text
GEN SYSTEM — governance, identity, approvals and audit
                     |
                     v
SG-FIN-001 — financial intelligence and accounting proposals
                     |
                     v
SG-BANKING-INFRA-001 — banking connectivity registry
                     |
           +---------+---------+
           |                   |
           v                   v
Simplicity Global          External institutions
platform/orchestration    banks, EMIs, PSPs, BaaS,
                          payment schemes and rails

Microsoft Partner Center is a separate incoming earnings/payout evidence source.
It reports amounts/statuses; it does not prove bank receipt.
```

## 2. Registry extension

`SG-BANKING-INFRA-012` retains the classification from the existing banking taxonomy:

- Category: named platform / vendor
- Subcategory: banking connectivity / aggregation / orchestration
- Infrastructure role: integration and access layer
- Payment rail: no
- Provider verification: pending official evidence

The connection-type catalogue below is proposed internal taxonomy. It does not imply that all connections are implemented or licensed.

| ID | Connection type | Registry status |
|---|---|---|
| SG-BANK-001 | API connectivity | Proposed |
| SG-BANK-002 | Portal connectivity | Proposed |
| SG-BANK-003 | Host-to-host / file connectivity | Proposed |
| SG-BANK-004 | Webhook / event connectivity | Proposed |
| SG-BANK-005 | Multi-bank aggregation | Proposed |
| SG-BANK-006 | Payment orchestration | Proposed |
| SG-BANK-007 | Virtual account connectivity | Proposed |
| SG-BANK-008 | Statements and reporting | Proposed |
| SG-BANK-009 | Indirect payment-rail access | Proposed |
| SG-BANK-010 | Sandbox and testing | Proposed |

## 3. Microsoft Partner Center payout integration

`SG-MS-PAYOUT-001` is registered as an inbound earnings and payout-reporting adapter under SG-FIN-001 and linked to this banking registry.

- Direction: inbound revenue evidence.
- Provider: Microsoft Partner Center.
- Purpose: earnings, withholding, fees, payout status and settlement evidence.
- Provider mode: read-only source normalisation.
- Payment rail: no.
- Money movement: no.
- Bank receipt: only confirmed from bank statement evidence.
- Live API and tenant consent: not configured.
- Xero: system of record; no existing bank account or chart-of-accounts mapping is modified.

The adapter generates accounting proposals and bank-match candidates only. Human finance review remains mandatory.

## 4. Preservation and activation gates

- Preserve existing bank accounts, bank relationships, payment integrations, ledger accounts and credentials.
- Do not store full bank account numbers, tax IDs, passwords or access tokens in the registry.
- Require provider documentation and legal/regulatory verification for every bank, EMI, PSP, BaaS or rail.
- Require least-privilege authentication, encryption, idempotency, signed webhooks, audit evidence and sandbox testing.
- Keep inbound Microsoft payout reporting separate from outgoing supplier/customer/contractor payment execution.
- Require separate approval before bank account changes, payment execution, ledger posting, tax submission, database migration or production deployment.

## 5. Related implementation

- `live-framework/FINANCIAL-INTELLIGENCE/src/microsoft-payouts.mjs`
- `live-framework/FINANCIAL-INTELLIGENCE/docs/microsoft-payouts.md`
- `live-framework/ARCHITECTURE-LIBRARY/modules/registry.json`
- `live-framework/ARCHITECTURE-LIBRARY/modules/integration-connectors.json`

All entries describe repository source state. They do not claim live banking access.
