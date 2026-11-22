# Browser API and identity adapter

**Status:** Browser API adapter and GitHub Enterprise brokered sign-in source prepared; not deployed or connected.

## GitHub Enterprise sign-in

The dashboard includes a GitHub Enterprise sign-in control backed by the organisation's OIDC identity broker. See ../identity/github-enterprise/README.md for provider registration, SSO and user-provisioning requirements.

Configuration is loaded from auth-config.js. The committed file is an intentionally empty, fail-closed template. Populate it only with verified public settings after the identity broker and API origins are selected. Never put a client secret, GitHub token, API key or private key in browser code.

The sign-in flow uses OIDC authorization code with PKCE S256, state and nonce. The browser keeps the access token in memory only. The SG-LIVE API independently validates its signature, issuer and audience, and rejects identities that have not been provisioned.

## API client

The browser API client receives a token callback from the approved host application and does not persist tokens.

## Security properties

- Requires HTTPS except for localhost development.
- Does not persist access tokens in localStorage or sessionStorage.
- Sends bearer credentials only to the configured API origin.
- Rejects cross-origin endpoint construction and redirects.
- Omits browser credentials and disables response caching.
- Sends organisation scope on every domain request.
- Sends legal-entity scope only for asset endpoints.
- Uses bounded request timeouts and sanitised errors.
- Does not automatically retry writes.

## Not yet implemented

- Production identity broker, GitHub OAuth App or SSO configuration.
- Admin user-provisioning workflow.
- Token refresh and server-side session persistence.
- Organisation/entity selector and membership-aware UI.
- Full dashboard rendering from API responses.
- API origin configuration and production CORS.
- End-to-end, accessibility and browser security testing.

Do not connect this adapter to production until identity, server-side authorisation, database RLS, secrets, monitoring and release gates are independently verified.
