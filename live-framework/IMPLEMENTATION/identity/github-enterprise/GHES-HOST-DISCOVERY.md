# SG-ID-001 — GitHub Enterprise Server host discovery and activation gate

**System:** Simplicity Global GEN SYSTEM  
**Domain reference:** `simplicityglobal.com`  
**Identity mode:** Self-hosted GitHub Enterprise Server (GHES)  
**State:** Design and source preparation only — activation blocked pending operator-supplied endpoint and version.

## 1. Confirmed decisions

- The selected upstream identity platform is self-hosted GitHub Enterprise Server, not GitHub Enterprise Cloud.
- `simplicityglobal.com` is the official domain reference supplied for this configuration.
- The existing sign-in design uses brokered OpenID Connect (OIDC), Authorization Code flow and PKCE S256.
- GitHub Enterprise access is an upstream identity check; the SG-LIVE API must continue validating broker-issued JWTs and enforce its own user provisioning, organisation membership and role checks.

## 2. What the domain does not establish

The domain reference alone does not identify a running GHES appliance or prove DNS, TLS, hosting or ownership. The following are possible naming patterns only, not verified endpoints:

- `https://github.simplicityglobal.com`
- `https://git.simplicityglobal.com`
- `https://ghes.simplicityglobal.com`

Do not probe, configure, or publish any of these candidates until the operator confirms the actual hostname. Do not assume the public website and GHES share a host.

## 3. Required operator-supplied values

| Field | Required value | Current state |
|---|---|---|
| GHES base URL | Full HTTPS instance URL, e.g. `https://github.example.com` | **Pending** |
| GHES version | Exact installed release/version | **Pending** |
| Organisation slug | Exact organisation name/slug on that instance | **Pending** |
| OIDC broker issuer | Exact HTTPS realm issuer URL | **Pending** |
| Web application origin | Actual deployed Simplicity Global app origin | Proposed reference only: `https://simplicityglobal.com` |
| Web callback URI | Exact route registered on the OIDC broker client | **Pending** |
| SG-LIVE API origin | Actual API origin | **Pending** |

Supply endpoint names and version information only. Do not send passwords, OAuth client secrets, personal access tokens, recovery codes, private keys or other credentials in chat.

## 4. Version and endpoint compatibility gate

After the exact GHES URL and version are supplied:

1. Confirm that the URL is the intended GHES instance and that its TLS certificate is valid.
2. Verify the installed GHES version against GitHub's official documentation and its supported OAuth application behaviour.
3. Determine the instance-specific authorization, token and user-profile endpoints from the official GHES documentation for that release.
4. Confirm that the broker's GHES identity-provider adapter supports the required OAuth flow and exact callback URI.
5. Confirm the broker can complete the upstream flow without exposing the GHES OAuth client secret to the browser.
6. Verify the broker advertises PKCE S256 for the downstream public OIDC client.
7. Confirm exact redirect URI and web-origin allowlists; wildcard origins are prohibited.
8. Keep automatic account provisioning disabled. An authenticated GHES user must still be explicitly provisioned in the Simplicity Global application.
9. Run a non-production acceptance test before considering production activation.

Do not reuse GitHub.com OAuth endpoints for a self-hosted GHES instance unless the official documentation for the specific instance explicitly requires them.

## 5. Security and change boundaries

This stage does not:
- create an OAuth App;
- change GHES or enterprise authentication policy;
- configure DNS, reverse proxies, TLS certificates or firewall rules;
- create or modify an identity-broker realm or client;
- grant repository or organisation permissions;
- provision application users;
- deploy the web application or API;
- execute a live sign-in test.

Any such action requires a separate, narrowly scoped approval after inspection and a reviewed change plan.

## 6. Activation decision

**Current system state:** `BLOCKED_PENDING_GHES_HOST_AND_VERSION`

The identity implementation remains fail-closed while required configuration is blank. The domain reference is recorded as `simplicityglobal.com`; it is not being treated as proof that a GHES endpoint exists.

**Next input needed:** the exact GHES HTTPS base URL and installed version, plus the organisation slug on that instance.
