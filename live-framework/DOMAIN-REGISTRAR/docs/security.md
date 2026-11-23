# Security and operational controls

- Default mode is mock and offline.
- No secrets, access tokens, API keys or private keys belong in Git.
- Provider credentials must be stored server-side in a dedicated secret store.
- Require MFA for registrar accounts and separate read/write credentials where supported.
- Registrar transfer lock and account recovery controls should be reviewed before production use.
- DNS changes require before/after snapshots, explicit approval, TTL review and rollback data.
- Domain registration, renewal, transfer, payment, nameserver and production actions require separate approvals.
- Bing verification evidence must be freshly issued for the exact canonical property; never reuse a token from another site.
- Log actor, target, action, approval reference, provider response and outcome; redact secrets.
- Enforce least privilege and tenant/entity scoping at the API and database layers.
- Run dependency, static analysis, unit, integration and recovery tests before release.
