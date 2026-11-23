# GitHub Enterprise sign-in configuration record

**Selected deployment:** Self-hosted GitHub Enterprise Server (GHES)  
**Corporate domain reference:** `simplicityglobal.com`  
**Activation state:** Blocked pending exact server, broker and API details.

| Setting | Planned value | State |
|---|---|---|
| Identity protocol | OIDC to SG-LIVE API | Existing API contract |
| Upstream identity | Self-hosted GitHub Enterprise Server via OIDC broker | Selected; endpoint unverified |
| Corporate domain reference | `https://simplicityglobal.com` | User-designated reference; DNS/hosting not verified |
| GHES base URL | Not supplied | Required |
| GHES version | Not supplied | Required for compatibility review |
| GHES organisation slug | Not supplied | Required if organisation membership is enforced |
| Broker alias | `github-enterprise` | Required |
| Broker product and realm | Not supplied | Required |
| Browser client | `simplicity-global-web` | Proposed; collision check required |
| Client type | Public | Required |
| Flow | Authorization code + PKCE S256 | Required |
| API identity | Broker issuer + subject | Required |
| Automatic app-user provisioning | Disabled | Required |
| GitHub repository scopes | None | Required |
| Live OAuth App | Not created/connected | Pending |
| Broker credentials | Not configured | Pending |
| Dashboard origin and callback | Not verified | Pending |
| SG-LIVE API origin | Not supplied | Required |

## Activation inputs still required

1. Exact GHES base URL, for example `https://github.simplicityglobal.com` only if that is the actual configured hostname.
2. Exact GHES version/build.
3. Whether access must be restricted to one GHES organisation; if yes, its exact slug.
4. Identity broker product and exact realm issuer URL.
5. Exact deployed dashboard origin and OIDC callback URI.
6. Exact SG-LIVE API origin.
7. Administrator-owned user provisioning and role-assignment process.

## Trust and configuration rules

- Use the GHES instance-specific OAuth endpoints; do not use GitHub.com endpoints for a self-hosted instance.
- Register the upstream OAuth application in GHES only after version-specific compatibility and callback details are verified.
- The upstream GHES OAuth callback is the broker's callback URL. The browser application's redirect URI is a separate broker-client callback.
- Request only minimum identity scopes. Do not request repository, workflow, organisation-administration or write scopes for application sign-in.
- Keep any client secret in an approved server-side secret manager; never place it in browser configuration, this file, Git history or chat.
- The broker must validate upstream GHES identity and issue its own OIDC tokens. The SG-LIVE API must independently validate issuer, signature, audience and provisioned subject.
- GitHub login, username, email, team membership or repository access does not automatically grant Simplicity Global application roles.
- Keep automatic application-user provisioning disabled.

This record is a design and configuration artefact. It does not establish that GHES, DNS, the identity broker, an OAuth application, SSO policy or the production website is configured.
