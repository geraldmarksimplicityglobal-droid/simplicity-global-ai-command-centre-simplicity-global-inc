# S I M P L I C I T Y  G L O B A L — LIVE ARCHITECTURE LIBRARY

**System ID:** SG-ARCH-LIB-001

Canonical, version-controlled index of framework modules, rooted folders, integration boundaries, runner nodes and evidence contracts.

## Library map
- `modules/registry.json` — canonical architecture module inventory.
- `modules/domain-registrar.json` — all 24 registrar modules.
- `modules/github-enterprise-identity.json` — brokered sign-in boundary.
- `modules/background-runner-network.json` — runner bot and GLOBAL MARK contract.
- `modules/integration-connectors.json` — Windows Commander, Postman, GitHub, VS Code, plugin, Xero, crypto-data and Supabase connectors.
- `../FINANCIAL-INTELLIGENCE/module.json` — SG-FIN-001 finance, fiat and crypto accounting contract.
- `schemas/module-manifest.schema.json` — module contract.
- `governance/operation-boundaries.json` — default-deny operation policy.
- `ROOTED-FOLDER-MAP.md` — source ownership and folder map.

Status labels distinguish source implementation, mock verification, unverified configuration, missing owner input and deployment. Passing CI or storing source does not prove live provider connection, domain ownership, sign-in or production deployment.

Never store credentials here. Production, DNS, registrar, identity-provider, payment and host operations require separate target-specific approval.
