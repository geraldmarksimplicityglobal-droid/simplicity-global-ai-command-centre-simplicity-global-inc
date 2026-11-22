const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeDomain(input) {
  if (typeof input !== "string") throw new TypeError("Domain must be a string");
  const value = input.trim().toLowerCase().replace(/\.$/, "");
  if (!DOMAIN_PATTERN.test(value)) throw new Error("Invalid domain name");
  return value;
}

export function domainRecord(input, status = "unverified") {
  return Object.freeze({
    domain: normalizeDomain(input),
    status,
    ownershipVerified: false,
    registrarProvider: null,
    dnsProvider: null
  });
}
