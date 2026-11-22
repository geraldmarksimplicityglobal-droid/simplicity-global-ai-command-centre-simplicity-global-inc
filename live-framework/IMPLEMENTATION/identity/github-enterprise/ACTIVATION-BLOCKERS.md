# SG-ID-001 — GHES activation blockers

The owner selected **self-hosted GitHub Enterprise Server** and designated `simplicityglobal.com` as the corporate domain reference. The brokered OIDC sign-in scaffold is present, and the configuration template now targets GHES.

## Required before activation

1. Exact GHES base URL (hostname and any non-default context path).
2. Exact GHES version/build, for version-specific OAuth and PKCE compatibility review.
3. Exact GHES organisation slug if organisation membership is a required access condition.
4. Identity broker product, realm and exact issuer URL.
5. Exact deployed dashboard origin and broker-client redirect URI.
6. Exact SG-LIVE API origin and server-side OIDC issuer/JWKS/audience configuration.
7. Administrator-owned user provisioning, organisation membership mapping and role-assignment process.
8. Confirmation of TLS validity, network reachability and administrator authority to register the broker OAuth application.

## Important callback distinction

The upstream GHES OAuth callback belongs to the broker's GHES identity-provider configuration. The browser redirect URI belongs to the broker's public OIDC client. These are different URLs and must be copied from the actual broker configuration; neither should be guessed.

## Security conditions

- Use the instance-specific GHES endpoints, not GitHub.com endpoints.
- Require HTTPS and exact origin/redirect allowlists.
- Require authorization code flow with PKCE S256, state and nonce.
- Do not bypass PKCE if the selected GHES/broker combination does not support it; stop and assess a compatible supported flow/version.
- Request only minimum identity scopes. No repository, workflow, admin:org or write scopes for sign-in.
- Keep OAuth client secrets in an approved secret manager only.
- Keep automatic application-user provisioning disabled.
- Require the API to validate broker-issued token signature, issuer and audience, then check the provisioned issuer/subject and server-side memberships.
- Do not treat GitHub username, email, repository role or enterprise membership as automatic Simplicity Global authorisation.

No OAuth App has been created, no GHES SSO policy changed, no broker configured, no sign-in performed and no production deployment made by this documentation update.
