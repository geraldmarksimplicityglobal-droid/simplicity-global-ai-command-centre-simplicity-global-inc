# GitHub Enterprise sign-in configuration record

| Setting | Planned value | State |
|---|---|---|
| Identity protocol | OIDC to SG-LIVE API | Existing API contract |
| Upstream identity | GitHub Enterprise Cloud via broker | Planned |
| Broker alias | github-enterprise | Required |
| Browser client | simplicity-global-web | Proposed; must be checked for collision |
| Client type | Public | Required |
| Flow | Authorization code + PKCE S256 | Required |
| API identity | Broker issuer + subject | Required |
| Automatic app-user provisioning | Disabled | Required |
| GitHub repository scopes | None | Required |
| Live OAuth App | Not created/connected | Pending |
| Broker credentials | Not configured | Pending |
| Dashboard/API origins | Not verified | Pending |

## Exact details still required for activation

- Identity broker product and realm URL.
- GitHub Enterprise Cloud organisation slug, or GHES hostname/version.
- Exact approved dashboard origin and callback URI.
- Exact SG-LIVE API origin.
- Confirmation that the enterprise permits the broker OAuth application and its minimal scopes.
- Administrator-controlled user provisioning process.

This configuration record is a design artefact. It does not claim that a GitHub Enterprise tenant, OAuth App, SSO policy, identity broker or production website is configured.
