# Webstudio management-interface adapter

Role: presentation layer for the domain management system.

Current state: interface contract only; no Webstudio project has been identified or connected in this repository increment.

Integration boundary:
- Webstudio consumes a future authenticated HTTPS API.
- Browser code receives short-lived user-scoped access only; registrar credentials and provider secrets remain server-side.
- Read-only views: domain inventory, verification status, DNS snapshot, sitemap status, audit history and module health.
- Write requests are represented as approval requests and must not mutate registrar/DNS state directly.
- CORS allowlists, session policy, CSRF protection and role checks are required before connection.
- Production publishing and custom-domain attachment remain separate approvals.
