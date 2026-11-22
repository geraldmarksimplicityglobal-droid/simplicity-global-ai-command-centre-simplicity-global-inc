# SG-ID-001 — Activation blockers

The brokered OIDC sign-in scaffold is present. Live activation requires:
1. GitHub Enterprise Cloud (`github.com`) or self-hosted GitHub Enterprise Server.
2. Cloud organisation slug and OAuth App SSO authorisation, or GHES hostname and exact version.
3. Identity broker product, realm and exact issuer URL.
4. Exact dashboard origin, callback URI and SG-LIVE API origin.
5. Administrator-owned provisioning and role-assignment process.

The GitHub OAuth callback belongs to the broker's upstream provider configuration. The browser redirect URI belongs to the broker's public OIDC client; they are different URLs. Do not infer an enterprise URL from the repository URL or use a ChatGPT share URL as a callback. HTTPS, exact origin allowlists, PKCE S256, state and nonce remain mandatory.

No OAuth App has been created, no enterprise SSO policy changed and no sign-in performed by this source update.
