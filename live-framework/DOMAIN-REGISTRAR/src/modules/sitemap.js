import { normalizeDomain } from "../domain/domain.js";

export function sitemapEndpoint(domain) {
  return `https://${normalizeDomain(domain)}/sitemap.xml`;
}

export function validateSitemapUrls(urls, domain) {
  const host = normalizeDomain(domain);
  if (!Array.isArray(urls)) throw new TypeError("urls must be an array");
  return urls.map((entry) => {
    const url = new URL(entry);
    if (url.protocol !== "https:" || url.hostname !== host) throw new Error("Sitemap URL must use the canonical HTTPS host");
    return url.toString();
  });
}
