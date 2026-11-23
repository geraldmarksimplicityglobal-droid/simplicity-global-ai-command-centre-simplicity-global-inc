# S I M P L I C I T Y  G L O B A L — LIVE ENTERPRISE FRAMEWORK

A separate, non-production enterprise operations console foundation.

## Current build
- Responsive single-page control-centre prototype.
- 14 enterprise framework domains.
- Local asset inventory with create/search/filter.
- SG-LEGAL-001–014 compliance register (source-derived titles where available; remaining items flagged pending).
- Integration catalogue with verified / unverified / disconnected distinctions.
- Change approval records, audit timeline, roadmap and control guardrails.
- JSON export and browser-local persistence.

## Safety and limitations
- This branch does not modify the repository's existing main branch.
- No cloud accounts, production systems, payment providers, identity providers, databases or monitoring feeds are connected.
- All sample records are demo/unverified; do not use as evidence of compliance or production status.
- Approval decisions are local workflow records and do not execute external changes.
- Browser local storage is not a secure multi-user database.
- No authentication, authorisation backend, server-side audit log, encryption-at-rest guarantee, backup or production deployment is included in this prototype.
- Do not place credentials, personal data, customer records or sensitive business data in this demo.
- Production rollout requires architecture review, authentication/RBAC, database and secret-vault setup, threat modelling, automated tests, legal review and explicit release approval.

## Run locally
Open `index.html` in a modern browser or serve this directory using any static file server.

## Deployment
Not deployed. Do not publish until production controls and approvals are complete.


## Rooted architecture and runner library

- [Architecture Library](./ARCHITECTURE-LIBRARY/README.md)
- [Background Runner Bots](./BACKGROUND-RUNNERS/README.md)
- [Domain Registrar module matrix](./DOMAIN-REGISTRAR/docs/module-implementation-matrix.md)
- [GitHub Enterprise activation blockers](./IMPLEMENTATION/identity/github-enterprise/ACTIVATION-BLOCKERS.md)

## Android engineering skill

- [SG Android App Engine](./ANDROID-APP-ENGINE/README.md)
- [Android skill instructions](./ANDROID-APP-ENGINE/SKILL.md)

The module is source-only and plan-only; no Android device, MT Manager, SDK, signing key or Play Console is connected.
