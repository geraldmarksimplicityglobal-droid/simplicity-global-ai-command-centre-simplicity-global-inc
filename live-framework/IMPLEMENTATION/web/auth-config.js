/**
 * Deployment-injected public identity settings.
 * Replace values only after the broker, callback and API origins are verified.
 * This file must never contain client secrets or access tokens.
 */
export const SG_AUTH_CONFIG = Object.freeze({
  issuer: "",
  clientId: "",
  redirectUri: "",
  apiBaseUrl: "",
  providerHint: "github-enterprise",
  scopes: ["openid", "profile"]
});
