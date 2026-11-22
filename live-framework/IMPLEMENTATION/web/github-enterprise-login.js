import { SG_AUTH_CONFIG } from "./auth-config.js";

const STORAGE_KEY = "sg.oidc.github-enterprise.transaction";
const MAX_TRANSACTION_AGE_MS = 10 * 60 * 1000;
let accessToken = null;
let expiresAt = 0;
let discovery = null;

function requireHttpsUrl(value, name) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(name + " must use HTTPS");
  }
  return url;
}

function randomValue(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, value => value.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("OIDC ID token is malformed");
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(atob(padded));
}

function configured() {
  if (!SG_AUTH_CONFIG.issuer || SG_AUTH_CONFIG.issuer.includes("IDENTITY-HOST") ||
      !SG_AUTH_CONFIG.clientId || SG_AUTH_CONFIG.clientId === "simplicity-global-web" ||
      !SG_AUTH_CONFIG.redirectUri || !SG_AUTH_CONFIG.apiBaseUrl ||
      !SG_AUTH_CONFIG.providerHint) {
    throw new Error("Enterprise sign-in has not been configured by the deployment administrator");
  }
  const issuerUrl = requireHttpsUrl(SG_AUTH_CONFIG.issuer, "OIDC issuer");
  const redirectUrl = requireHttpsUrl(SG_AUTH_CONFIG.redirectUri, "OIDC redirect URI");
  const apiUrl = requireHttpsUrl(SG_AUTH_CONFIG.apiBaseUrl, "API base URL");
  if (redirectUrl.username || redirectUrl.password || redirectUrl.hash ||
      apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new Error("OIDC redirect or API URL contains unsupported components");
  }
  return { issuerUrl, redirectUrl, apiUrl };
}

async function getDiscovery() {
  if (discovery) return discovery;
  const { issuerUrl } = configured();
  const response = await fetch(new URL(".well-known/openid-configuration", issuerUrl.href.endsWith("/") ? issuerUrl : issuerUrl.href + "/"), {
    headers: { Accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
    redirect: "error"
  });
  if (!response.ok) throw new Error("Identity provider discovery failed");
  const metadata = await response.json();
  const expectedIssuer = issuerUrl.href.replace(/\/$/, "");
  if (typeof metadata.issuer !== "string" || metadata.issuer.replace(/\/$/, "") !== expectedIssuer) {
    throw new Error("Identity provider issuer did not match configured issuer");
  }
  for (const field of ["authorization_endpoint", "token_endpoint"]) {
    const endpoint = new URL(metadata[field]);
    if (endpoint.origin !== issuerUrl.origin || endpoint.protocol !== "https:") {
      throw new Error("Identity provider returned an untrusted " + field);
    }
  }
  if (!Array.isArray(metadata.response_types_supported) ||
      !metadata.response_types_supported.includes("code") ||
      !Array.isArray(metadata.code_challenge_methods_supported) ||
      !metadata.code_challenge_methods_supported.includes("S256")) {
    throw new Error("Identity provider must support authorization code flow with PKCE S256");
  }
  discovery = metadata;
  return discovery;
}

export async function beginGitHubEnterpriseSignIn() {
  const { redirectUrl } = configured();
  const metadata = await getDiscovery();
  const state = randomValue();
  const nonce = randomValue();
  const verifier = randomValue(48);
  const challenge = await challengeFor(verifier);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    state, nonce, verifier, createdAt: Date.now()
  }));
  const authorize = new URL(metadata.authorization_endpoint);
  authorize.search = new URLSearchParams({
    client_id: SG_AUTH_CONFIG.clientId,
    redirect_uri: redirectUrl.href,
    response_type: "code",
    scope: (SG_AUTH_CONFIG.scopes || ["openid", "profile"]).join(" "),
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    kc_idp_hint: SG_AUTH_CONFIG.providerHint
  }).toString();
  window.location.assign(authorize.href);
}

export async function completeGitHubEnterpriseSignIn() {
  const current = new URL(window.location.href);
  const code = current.searchParams.get("code");
  const returnedState = current.searchParams.get("state");
  const oauthError = current.searchParams.get("error");
  if (!code && !oauthError) return false;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  window.history.replaceState({}, document.title, current.pathname + current.hash);
  if (oauthError) throw new Error("GitHub Enterprise sign-in was cancelled or rejected");
  if (!raw || !returnedState) throw new Error("Sign-in transaction is missing");
  const transaction = JSON.parse(raw);
  if (transaction.state !== returnedState ||
      !Number.isFinite(transaction.createdAt) ||
      Date.now() - transaction.createdAt > MAX_TRANSACTION_AGE_MS) {
    throw new Error("Sign-in state is invalid or expired");
  }

  const { redirectUrl } = configured();
  const metadata = await getDiscovery();
  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: SG_AUTH_CONFIG.clientId,
      redirect_uri: redirectUrl.href,
      code,
      code_verifier: transaction.verifier
    })
  });
  if (!response.ok) throw new Error("Identity provider token exchange failed");
  const tokens = await response.json();
  if (typeof tokens.access_token !== "string" || tokens.token_type?.toLowerCase() !== "bearer" ||
      !Number.isFinite(tokens.expires_in) || tokens.expires_in < 1 ||
      typeof tokens.id_token !== "string") {
    throw new Error("Identity provider returned an invalid token response");
  }

  // The ID token is not used as the application credential. The API independently
  // verifies the access-token signature, issuer and audience using its configured JWKS.
  // This nonce check binds the returned OIDC response to the browser transaction.
  const idClaims = decodeJwtPayload(tokens.id_token);
  if (idClaims.nonce !== transaction.nonce) {
    throw new Error("OIDC nonce validation failed");
  }
  accessToken = tokens.access_token;
  expiresAt = Date.now() + tokens.expires_in * 1000;
  return true;
}

export function getGitHubEnterpriseAccessToken() {
  if (!accessToken || Date.now() >= expiresAt) {
    accessToken = null;
    expiresAt = 0;
    return null;
  }
  return accessToken;
}

export function signOutGitHubEnterprise() {
  accessToken = null;
  expiresAt = 0;
}

export function isGitHubEnterpriseSignedIn() {
  return Boolean(getGitHubEnterpriseAccessToken());
}

async function verifyApplicationAccess() {
  const token = getGitHubEnterpriseAccessToken();
  if (!token) return { status: "signed-out" };
  const { apiUrl } = configured();
  const response = await fetch(new URL("/api/me", apiUrl), {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    credentials: "omit",
    cache: "no-store",
    redirect: "error"
  });
  if (response.status === 403) return { status: "identity-not-provisioned" };
  if (response.status === 401) return { status: "token-rejected" };
  if (!response.ok) return { status: "api-unavailable" };
  return { status: "application-authorized", profile: await response.json() };
}

function renderAuthControl() {
  const host = document.getElementById("sg-enterprise-auth");
  if (!host) return;
  host.replaceChildren();
  const button = document.createElement("button");
  button.className = "btn";
  button.type = "button";
  button.textContent = isGitHubEnterpriseSignedIn() ? "Sign out" : "Sign in with GitHub Enterprise";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (isGitHubEnterpriseSignedIn()) {
        signOutGitHubEnterprise();
        host.dataset.status = "signed-out";
        renderAuthControl();
        return;
      }
      await beginGitHubEnterpriseSignIn();
    } catch (error) {
      host.dataset.status = "configuration-error";
      host.title = error.message;
      button.textContent = "Sign-in not configured";
      button.disabled = false;
    }
  });
  host.append(button);
}

async function initialise() {
  renderAuthControl();
  try {
    const completed = await completeGitHubEnterpriseSignIn();
    if (completed) {
      const status = await verifyApplicationAccess();
      const host = document.getElementById("sg-enterprise-auth");
      if (host) host.dataset.status = status.status;
      if (host) host.title = status.status === "application-authorized"
        ? "Identity accepted and application access provisioned"
        : status.status === "identity-not-provisioned"
          ? "GitHub identity accepted; an administrator must provision application access"
          : "Identity accepted; API access could not be confirmed";
      renderAuthControl();
    }
  } catch (error) {
    const host = document.getElementById("sg-enterprise-auth");
    if (host) {
      host.dataset.status = "sign-in-error";
      host.title = error.message;
    }
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void initialise();
  window.SG_AUTH = Object.freeze({
    getAccessToken: getGitHubEnterpriseAccessToken,
    isSignedIn: isGitHubEnterpriseSignedIn,
    signOut: signOutGitHubEnterprise
  });
}
