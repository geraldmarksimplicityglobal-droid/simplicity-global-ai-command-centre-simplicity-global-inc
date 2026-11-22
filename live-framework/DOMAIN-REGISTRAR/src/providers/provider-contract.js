export const REQUIRED_PROVIDER_METHODS = [
  "getCapabilities",
  "getDomainStatus",
  "getDnsRecords"
];

export function validateProvider(provider) {
  if (!provider || typeof provider.id !== "string") throw new TypeError("Provider id is required");
  for (const method of REQUIRED_PROVIDER_METHODS) {
    if (typeof provider[method] !== "function") throw new TypeError(`Provider missing method: ${method}`);
  }
  return provider;
}
