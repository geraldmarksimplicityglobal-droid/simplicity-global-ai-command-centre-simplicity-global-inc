import { normalizeDomain } from "../domain/domain.js";

export function bingProperty(domain) {
  const normalized = normalizeDomain(domain);
  return {
    property: `https://${normalized}/`,
    sitemap: `https://${normalized}/sitemap.xml`,
    verification: { status: "not-configured", method: null, token: null }
  };
}

export function assertFreshVerificationEvidence(evidence, domain) {
  const normalized = normalizeDomain(domain);
  if (!evidence || evidence.domain !== normalized || !evidence.issuedAt || !evidence.method) {
    throw new Error("Fresh domain-specific Bing verification evidence is required");
  }
  return true;
}
