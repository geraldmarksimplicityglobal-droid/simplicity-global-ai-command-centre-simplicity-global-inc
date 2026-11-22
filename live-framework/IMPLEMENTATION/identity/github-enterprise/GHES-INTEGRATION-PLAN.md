# SG-ID-002 — Self-hosted GitHub Enterprise Server integration plan

**Target:** Simplicity Global GEN SYSTEM  
**Corporate domain reference:** `simplicityglobal.com`  
**Upstream identity:** Self-hosted GitHub Enterprise Server (GHES)  
**Pattern:** GHES OAuth identity provider → OIDC broker → SG-LIVE API  
**Mode:** Configuration preparation; no live provider or infrastructure changes authorised.

## 1. Trust topology

```text
User browser
   |
   | OIDC Authorization Code + PKCE S256
   v
Simplicity Global OIDC broker
   |
   | GHES-specific upstream OAuth authorization
   v
Self-hosted GitHub Enterprise Server
   |
   | Broker validates upstream identity
   v
OIDC broker issues Simplicity Global access token
   |
   | Bearer token; independently validated
   v
SG-LIVE API → provisioned app user → organisation membership → permissions
```

The SG-LIVE API trusts the broker, not a GitHub OAuth access token. The browser must never send a GHES OAuth token to the business API.

## 2. Endpoint discovery — do not guess

After the operator supplies the exact GHES base URL and version:

1. Confirm the canonical HTTPS origin and any configured context path with the GHES administrator.
2. Consult the documentation for that exact GHES release to confirm supported OAuth App behaviour and any PKCE limitations.
3. In the broker's supported GitHub/GHES identity-provider configuration, select the GHES-specific base URL and let the broker derive or document the correct authorize, token and user-profile endpoints.
4. Verify the configured upstream callback URL from the broker itself. Register that exact callback in the GHES OAuth App.
5. Confirm that the broker validates the GHES issuer/host and maps the stable upstream account identifier; do not key account identity solely on mutable username or email.
6. Confirm the broker advertises OIDC authorization-code flow and PKCE S256 for the browser client.
7. If the selected GHES version or broker adapter cannot provide the required security properties, stop. Do not silently downgrade to an insecure or unsupported flow.

No GHES endpoint path is hardcoded in this plan because the actual server hostname, version and broker product have not been supplied.

## 3. Broker client

Create or configure a dedicated public browser client only after the deployed application origins are confirmed.

- Proposed client ID: `simplicity-global-web` (check for collision first).
- Client type: public.
- Flow: authorization code.
- PKCE: S256 required.
- Redirect URI: exact deployed dashboard callback.
- Web origin: exact deployed dashboard origin.
- Scopes: `openid profile`; add email only for a documented need.
- Identity-provider alias: `github-enterprise`.
- Wildcard redirect URIs and wildcard origins: prohibited.
- Browser client secret: none.
- Upstream GHES OAuth client secret: server-side secret manager only.

The GHES OAuth App callback is the broker's upstream callback. It is not the browser client's redirect URI.

## 4. Access control

Authentication is not authorisation.

- Disable unrestricted first-login registration and automatic application-user creation.
- Require an administrator-provisioned application user mapped to the broker's exact `issuer + subject`.
- Map GHES organisation membership only if explicitly required and verified through a least-privilege broker integration.
- Apply Simplicity Global roles, legal-entity scope and permissions inside SG-LIVE, not from repository permissions.
- Return a non-disclosing denial for unprovisioned identities.
- Audit authentication result, provisioned identity reference, policy decision and correlation ID; do not log tokens or secrets.

## 5. Acceptance test plan

| Test | Expected result |
|---|---|
| Missing browser configuration | Sign-in disabled; fail closed |
| HTTP identity/API endpoint outside local development | Rejected |
| Discovery issuer mismatch | Rejected |
| Authorization/token endpoint outside approved GHES/broker origin | Rejected |
| PKCE S256 unavailable | Activation blocked |
| Missing, mismatched or expired state | Callback rejected |
| OIDC nonce mismatch | Callback rejected |
| Invalid broker token signature, issuer or audience | API returns 401 |
| Valid identity without provisioned app user | API returns 403 |
| Provisioned identity without required membership | Denied |
| Repository role without SG-LIVE permission | Denied |
| Sign-out or token expiry | In-memory access token cleared |
| Logs inspected for credentials | No access tokens, client secrets or PKCE verifier |

## 6. Activation gates

- [ ] GHES hostname and version verified by administrator.
- [ ] Organisation restriction and slug confirmed, if applicable.
- [ ] Broker product and realm issuer verified.
- [ ] Broker GHES adapter compatibility documented.
- [ ] GHES OAuth callback copied from broker.
- [ ] Dashboard origin, redirect URI and API origin verified.
- [ ] TLS and network reachability tested.
- [ ] Least-privilege scopes approved.
- [ ] Secret manager location approved and populated by administrator.
- [ ] User provisioning and role mapping reviewed.
- [ ] Security acceptance tests passed.
- [ ] Separate explicit approval recorded for creating/configuring OAuth App and broker settings.
- [ ] Separate release approval recorded before production activation.

## 7. Current state

The repository contains a brokered OIDC browser scaffold and this GHES-specific implementation plan. The exact GHES host/version, broker, callback, dashboard deployment and API origin remain unknown. Therefore no live integration is claimed and activation remains blocked.
