/**
 * S I M P L I C I T Y  G L O B A L — browser API adapter.
 *
 * No credentials are persisted here. Supply an access-token callback from an
 * approved OIDC client and an explicit organisation context from the signed-in
 * user's authorised workspace selection.
 */
export class FrameworkApiError extends Error {
  constructor(message, { status = 0, code = "request_failed" } = {}) {
    super(message);
    this.name = "FrameworkApiError";
    this.status = status;
    this.code = code;
  }
}

export function createFrameworkApi({
  baseUrl,
  getAccessToken,
  getOrganisationId,
  getLegalEntityId = () => null,
  timeoutMs = 12000
}) {
  if (typeof getAccessToken !== "function" ||
      typeof getOrganisationId !== "function") {
    throw new TypeError("Token and organisation context callbacks are required");
  }

  const base = new URL(baseUrl);
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.pathname !== "/") {
    throw new TypeError("API base URL must be the origin root");
  }
  if (base.protocol !== "https:" && !(base.protocol === "http:" && localHost)) {
    throw new TypeError("API base URL must use HTTPS outside local development");
  }

  async function request(path, {
    method = "GET",
    body,
    assetScope = false,
    organisationScope = true
  } = {}) {
    const endpoint = new URL(path, base);
    if (endpoint.origin !== base.origin || !endpoint.pathname.startsWith(base.pathname)) {
      throw new FrameworkApiError("API endpoint is outside the configured base URL", {
        code: "invalid_endpoint"
      });
    }

    const token = await getAccessToken();
    if (typeof token !== "string" || token.length < 20) {
      throw new FrameworkApiError("A valid access token is unavailable", {
        code: "authentication_required"
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    };
    if (organisationScope) {
      const organisationId = await getOrganisationId();
      if (typeof organisationId !== "string" || !organisationId) {
        throw new FrameworkApiError("Select an authorised organisation first", {
          code: "organisation_scope_required"
        });
      }
      headers["x-organisation-id"] = organisationId;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";

    if (assetScope) {
      const legalEntityId = await getLegalEntityId();
      if (legalEntityId) headers["x-legal-entity-id"] = legalEntityId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new FrameworkApiError(
          "The enterprise API rejected the request",
          {
            status: response.status,
            code: typeof payload?.error === "string" ? payload.error : "request_failed"
          }
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof FrameworkApiError) throw error;
      if (error?.name === "AbortError") {
        throw new FrameworkApiError("The enterprise API request timed out", {
          code: "request_timeout"
        });
      }
      throw new FrameworkApiError("The enterprise API could not be reached", {
        code: "network_error"
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    me: () => request("/api/me", { organisationScope: false }),
    listAssets: () => request("/api/assets", { assetScope: true }),
    createAsset: asset => request("/api/assets", {
      method: "POST", body: asset, assetScope: true
    }),
    listComplianceDocuments: () => request("/api/compliance/documents"),
    listChangeRequests: () => request("/api/change-requests"),
    createChangeRequest: change => request("/api/change-requests", {
      method: "POST", body: change
    }),
    listIncidents: () => request("/api/incidents"),
    listAuditEvents: () => request("/api/audit-events")
  });
}
