# SG-IDP-GITHUB-001 — GitHub Enterprise sign-in

**Integration pattern:** GitHub Enterprise OAuth identity brokered through the existing OIDC provider.  
**Application protocol:** OpenID Connect authorization-code flow with PKCE S256.  
**Default identity provider alias:** `github-enterprise`.  
**State:** Source integration prepared; provider registration and live sign-in are not configured or verified.

## Why the broker pattern is used

The existing SG-LIVE API already validates OIDC access tokens against a configured issuer, JWKS endpoint and audience, then checks the identity against provisioned application users and memberships. GitHub OAuth is not itself the API's OIDC issuer. A broker (for example, the existing organisation's Keycloak realm) keeps the API's trust boundary consistent and prevents GitHub access tokens from being accepted directly by the business API.

The browser login sends the user to the configured OIDC broker with `kc_idp_hint=github-enterprise`. The broker performs upstream GitHub Enterprise authentication and returns an OIDC access token for Simplicity Global. The API independently verifies that token and checks user provisioning and permissions.

## GitHub Enterprise Cloud setup

1. Confirm the organisation's GitHub Enterprise Cloud account and the exact GitHub organisation slug. Do not infer either from repository ownership.
2. In the broker, create an upstream GitHub identity provider using the GitHub.com OAuth endpoints:
   - Authorize: `https://github.com/login/oauth/authorize`
   - Token: `https://github.com/login/oauth/access_token`
   - User profile: `https://api.github.com/user`
3. Register a dedicated GitHub OAuth App for the broker. Set its callback URL to the broker's exact identity-provider callback URL shown by the broker. Do not use the Simplicity Global website URL as the GitHub OAuth callback.
4. Request only the minimum identity scopes needed. `read:user` is the baseline; add `read:org` only if the broker will enforce membership in a named enterprise organisation. Do not request `repo`, `workflow`, `admin:org`, or write scopes for sign-in.
5. If the GitHub organisation enforces SAML SSO or enterprise SSO, authorize the OAuth App for that organisation under its SSO policy. A successful GitHub sign-in alone is not proof of organisation membership.
6. Set the broker identity-provider alias to exactly `github-enterprise`. Configure first-login behaviour so sign-in does not silently grant business-system roles or broad tenant membership.
7. Disable unrestricted self-registration. The API's existing `app_users` provisioning check remains mandatory.

## GitHub Enterprise Server

A GHES deployment uses the instance-specific hostname and OAuth endpoints, not the GitHub.com endpoints above. Confirm the exact GHES hostname and version first. The current browser integration requires broker discovery to advertise PKCE S256; do not bypass that requirement. Configure a separate broker provider and callback for GHES after version-specific compatibility review. Never substitute a GHES hostname without operator confirmation.

## OIDC client configuration

Create a public browser client in the broker:
- Client ID: `simplicity-global-web` (example; confirm availability before use).
- Client type: public.
- Standard authorization-code flow: enabled.
- PKCE method: S256 required.
- Client secret in browser: none.
- Redirect URI: exact deployed dashboard origin/path, currently only a proposed reference of `https://simplicityglobal.com/`.
- Web origin: exact deployed dashboard origin.
- Scopes: `openid profile`; add email only if a documented business requirement exists.
- Identity-provider hint: `github-enterprise`.
- No wildcard redirect URI or wildcard web origin.

The browser configuration is supplied by `web/auth-config.js`, copied from `web/auth-config.example.js` only after the actual broker and API origins are known. It contains public configuration only, never client secrets or tokens.

## Application access and authorization

- The API continues to verify the OIDC access token's signature, issuer and audience.
- The broker issuer must exactly match `OIDC_ISSUER`; the broker JWKS endpoint and API audience must be configured server-side.
- The API's `app_users` record must exist and be active for the broker-issued `issuer + subject` pair.
- Organisation memberships, legal-entity scope and permissions remain server-side controls.
- A GitHub username, email address, repository role or enterprise membership does not automatically grant a Simplicity Global role.
- Unprovisioned identities receive `403 user_not_provisioned`.
- The browser holds the access token in memory only; it does not persist access or refresh tokens in localStorage or sessionStorage.
- The PKCE verifier and OIDC state/nonce are temporary sessionStorage transaction values and are removed during callback processing.
- No GitHub token is sent to the SG-LIVE API.

## Deployment configuration checklist

Required public browser configuration:
- `issuer`: exact OIDC broker realm issuer.
- `clientId`: public OIDC client ID.
- `redirectUri`: exact deployed callback URI.
- `apiBaseUrl`: exact SG-LIVE API origin.
- `providerHint`: `github-enterprise`.
- `scopes`: `openid profile`.

Required API configuration remains:
- `OIDC_ISSUER`
- `OIDC_JWKS_URL`
- `OIDC_AUDIENCE`
- `CORS_ORIGINS`
- `DATABASE_URL`

Do not commit secrets, create a GitHub OAuth App, alter organisation SSO, change broker settings, or connect a live identity provider as part of this source-only increment.

## Acceptance checks

- Missing/placeholder browser config fails closed.
- Only HTTPS identity, token and API endpoints are accepted outside local development.
- Discovery issuer and endpoint origins are checked.
- Authorization code flow uses state, nonce and PKCE S256.
- Callback state must match a recent browser transaction.
- Browser token memory is cleared on sign-out and expiry.
- API independently verifies issuer, audience and token signature.
- Unprovisioned identities remain denied.
- No repository or organisation permissions are requested for sign-in.


## Activation profile

Use `activation-profile.example.json` as a non-secret template. Complete the exact Cloud/Server identity, broker issuer, callback and API origin only after the owner confirms them. Never add a client secret or token to this file or browser configuration. See `ACTIVATION-BLOCKERS.md`.
