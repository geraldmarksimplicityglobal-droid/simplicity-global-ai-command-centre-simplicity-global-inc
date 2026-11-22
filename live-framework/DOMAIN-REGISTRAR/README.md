# S I M P L I C I T Y  G L O B A L
## Domain Registrar System

**System ID:** SG-DOM-001  
**Status:** Foundation scaffold — mock mode only  
**Canonical domain reference:** https://simplicityglobal.com  
**Source branch:** codex/live-enterprise-framework

This package is the portable domain-management foundation for the Simplicity Global ecosystem. It is designed to be reused from a standalone checkout, the existing GitHub repository, HP Windows 11/Codex, Huawei P30 Pro/Termux, and a Webstudio front end.

## Safety boundary

- Provider defaults to `mock`; no registrar, DNS, hosting, Bing, payment or external API connection is made.
- Domain purchases, transfers, renewals, DNS writes, nameserver changes, SSL issuance and production deployment are disabled.
- Read-only discovery is the default for future adapters.
- Mutating operations require a separate, scoped approval object and provider capability.
- Approval is not execution. A real provider adapter must be separately reviewed, configured and tested before it can perform an external action.
- Never put credentials in source control. Use a secrets manager or local environment variables when a real connection is later approved.

## Root layout

- `src/core` — configuration, approvals and audit events.
- `src/domain` — domain value objects and validation.
- `src/providers` — provider contract, registry and mock provider.
- `src/modules` — registrar, DNS, Bing verification and sitemap modules.
- `src/adapters` — platform capability descriptions for Windows, Termux and Webstudio.
- `database` — proposed PostgreSQL schema; not applied.
- `docs` — architecture, security and rollout controls.
- `test` — offline unit tests.

## Quick start

Requires Node.js 20 or later.

```sh
npm test
npm run check
```

The package intentionally has no runtime dependencies. The default provider is an in-memory mock and does not perform network requests.

## Target integration map

| Target | Intended role | Current state |
|---|---|---|
| Standalone package | Portable reference implementation | Source scaffold |
| Existing GitHub repository | Canonical source control | This branch |
| HP Windows 11 / Codex | Primary development host | Adapter contract only |
| Huawei P30 Pro / Termux | Secondary local runtime | Adapter contract only |
| Webstudio | Management UI integration | API boundary documented; not connected |

## Domain reference

`simplicityglobal.com` is the configured canonical reference domain. Its registration, ownership, DNS, hosting and operational website status must be independently verified. This package does not assert that the domain is registered or controlled by the project.
