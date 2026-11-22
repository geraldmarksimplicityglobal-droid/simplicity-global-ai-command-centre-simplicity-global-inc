/**
 * Public browser configuration template.
 * Copy into the deployment's config injection mechanism; never place secrets here.
 */
export const SG_AUTH_CONFIG = Object.freeze({
  issuer: "https://IDENTITY-HOST.example/realms/simplicity-global",
  clientId: "simplicity-global-web",
  redirectUri: "https://simplicityglobal.com/",
  apiBaseUrl: "https://API-HOST.example",
  providerHint: "github-enterprise",
  scopes: ["openid", "profile"]
});
