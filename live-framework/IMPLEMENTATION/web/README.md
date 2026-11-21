# Browser API adapter

**Status:** Prepared for integration; not wired into the dashboard.

## Purpose

Provides a small browser-side client for the SG-LIVE API without persisting
access tokens or embedding credentials in the frontend.

## Integration contract

Create the client only after the OIDC provider and API origin have been
selected and approved:

```js
import { createFrameworkApi } from "./api-client.js";

const api = createFrameworkApi({
  baseUrl: window.SG_CONFIG.apiBaseUrl,
  getAccessToken: () => window.SG_AUTH.getAccessToken(),
  getOrganisationId: () => window.SG_WORKSPACE.organisationId,
  getLegalEntityId: () => window.SG_WORKSPACE.legalEntityId
});
```

The `SG_CONFIG`, `SG_AUTH` and `SG_WORKSPACE` objects above are integration
interfaces, not existing globals. They must be implemented by the approved
host application and OIDC library before this example can run.

## Security properties

- Requires HTTPS except for localhost development.
- Obtains a fresh access token through a caller-supplied callback.
- Does not store tokens in localStorage, sessionStorage or cookies.
- Sends bearer credentials only to the configured API origin.
- Rejects cross-origin endpoint construction and redirects.
- Omits browser credentials and disables response caching.
- Sends organisation scope on every domain request.
- Sends legal-entity scope only for asset endpoints, matching current API scope.
- Uses bounded request timeouts and sanitised errors.
- Does not automatically retry writes.

## Not yet implemented

- OIDC login, logout, refresh-token rotation or MFA.
- Organisation/entity selector and membership-aware UI.
- Dashboard rendering from API responses.
- Uploads and evidence storage.
- Full domain CRUD.
- API origin configuration and production CORS.
- End-to-end, accessibility and browser security testing.

Do not connect this adapter to production until identity, server-side authorisation,
database RLS, secrets, monitoring and release gates are independently verified.
