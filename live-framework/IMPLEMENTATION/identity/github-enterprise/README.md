# SG-IDP-GITHUB-001 — GitHub Enterprise sign-in

**Selected upstream identity:** Self-hosted GitHub Enterprise Server (GHES).  
**Corporate domain reference:** `simplicityglobal.com` (domain ownership, DNS and hosting are not verified by this configuration).  
**Integration pattern:** GHES OAuth identity brokered through the Simplicity Global OIDC provider.  
**Application protocol:** OpenID Connect authorization-code flow with PKCE S256.  
**Identity-provider alias:** `github-enterprise`.  
**State:** Source integration and GHES-specific plan prepared; provider registration and live sign-in are not configured or verified.

## Why the broker pattern is used

The SG-LIVE API validates OIDC access tokens against a configured issuer, JWKS endpoint and audience, then checks the identity against provisioned application users and memberships. GitHub OAuth is not itself the API's OIDC issuer. A broker keeps the API trust boundary consistent and prevents GitHub OAuth access tokens from being accepted directly by the business API.

The browser login sends the user to the configured OIDC broker with `kc_idp_hint=github-enterprise`. The broker performs upstream GHES authentication and returns a Simplicity Global OIDC access token. The API independently verifies that token and checks user provisioning and permissions.

## Selected GHES configuration

A GHES deployment uses the instance-specific hostname and OAuth endpoints, not GitHub.com endpoints. The exact GHES hostname and version have not yet been supplied. Do not guess the hostname or endpoint paths.

1. Confirm the exact GHES HTTPS base URL and version/build with the GHES administrator.
2. Confirm the organisation slug if access is restricted to a particular GHES organisation.
3. Confirm the identity broker product and exact realm issuer.
4. In the broker's supported GHES adapter, configure the instance-specific endpoints and retrieve the broker-generated upstream callback URL.
5. Register a dedicated OAuth App in GHES using that exact broker callback URL, after compatibility review and separate approval.
6. Request only minimum identity scopes. Do not request repository, workflow, organisation-administration or write scopes for sign-in.
7. Confirm the broker supports authorization-code flow with PKCE S256 for the browser client. If not, stop and assess compatibility; do not bypass the requirement.
8. Disable unrestricted first-login registration and automatic Simplicity Global application-user provisioning.

## Callback distinction

The upstream GHES OAuth callback belongs to the broker's GHES identity-provider configuration. The browser redirect URI belongs to the broker's public OIDC client. They are different URLs and must be copied from the actual broker configuration.

## OIDC client configuration

Create or configure a public browser client in the broker only after deployment origins are confirmed:

- Client ID: `simplicity-global-web` (proposed; check for collision).
- Client type: public; no browser client secret.
- Flow: authorization code; PKCE S256 required.
- Redirect URI: exact deployed dashboard callback.
- Web origin: exact deployed dashboard origin.
- Scopes: `openid profile`; add email only for a documented requirement.
- Identity-provider hint: `github-enterprise`.
- No wildcard redirect URI or wildcard web origin.

The upstream GHES OAuth client secret belongs in an approved server-side secret manager only. It must never be placed in browser configuration or source control.

## Application access and authorization

- The API trusts broker-issued OIDC access tokens, not GHES OAuth access tokens.
- The API independently verifies token signature, issuer and audience using server-side configuration.
- The API's provisioned application-user record must exist and be active for the broker-issued `issuer + subject` pair.
- Organisation membership, legal-entity scope and permissions remain server-side controls.
- A GitHub username, email address, GHES organisation membership or repository role does not automatically grant a Simplicity Global application role.
- Unprovisioned identities remain denied.
- Browser access tokens remain in memory only; do not persist access or refresh tokens in localStorage or sessionStorage.
- Never log tokens, client secrets or PKCE verifiers.

## Required configuration

Public browser configuration:
- Exact broker issuer.
- Public OIDC client ID.
- Exact dashboard callback URI.
- Exact SG-LIVE API origin.
- Provider hint `github-enterprise`.
- Scopes `openid profile`.

Server-side API configuration:
- `OIDC_ISSUER`
- `OIDC_JWKS_URL`
- `OIDC_AUDIENCE`
- `CORS_ORIGINS`
- `DATABASE_URL`

## Implementation documents

- [GHES integration plan](./GHES-INTEGRATION-PLAN.md)
- [Configuration record](./CONFIGURATION.md)
- [Non-secret activation profile](./activation-profile.example.json)
- [Activation blockers](./ACTIVATION-BLOCKERS.md)

## Activation and change controls

Do not create an OAuth App, alter GHES SSO policy, configure the broker, change production DNS, or connect a live identity provider as part of this source-only implementation. Those are separate external changes requiring exact target details and explicit scoped approval.

## Acceptance checks

- Missing/placeholder browser config fails closed.
- Only HTTPS identity, token and API endpoints are accepted outside local development.
- Broker discovery issuer and endpoint origins are checked.
- Authorization code flow uses state, nonce and PKCE S256.
- Callback state must match a recent browser transaction.
- Browser token memory is cleared on sign-out and expiry.
- API independently verifies broker token issuer, audience and signature.
- Unprovisioned identities remain denied.
- No repository or organisation permissions are requested for sign-in.
