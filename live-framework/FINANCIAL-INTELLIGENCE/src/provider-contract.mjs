const VALID_MODES = new Set(["read_only", "scoped_write", "disabled"]);

export function defineFinancialProvider(config) {
  if (!config || typeof config !== "object") throw new TypeError("provider configuration required");
  if (typeof config.id !== "string" || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(config.id)) {
    throw new TypeError("provider id must be a stable lowercase identifier");
  }
  if (!Array.isArray(config.capabilities) || config.capabilities.length === 0 ||
      config.capabilities.some(value => typeof value !== "string" || !value.trim())) {
    throw new TypeError("provider capabilities are required");
  }
  const mode = config.mode ?? "read_only";
  if (!VALID_MODES.has(mode)) throw new TypeError("invalid provider mode");
  return Object.freeze({
    id: config.id, mode,
    capabilities: Object.freeze([...new Set(config.capabilities)]),
    credentialRef: config.credentialRef ?? null,
    writesEnabled: mode === "scoped_write" && config.writesEnabled === true
  });
}

export function assertProviderCapability(provider, capability, context = {}) {
  if (!provider || provider.mode === "disabled") throw new Error("provider is disabled");
  if (!provider.capabilities.includes(capability)) throw new Error("provider capability is not declared");
  if (capability.endsWith(":write")) {
    if (provider.mode !== "scoped_write" || provider.writesEnabled !== true) throw new Error("provider writes are disabled by default");
    if (!context.approval || !context.executionAuthorisation) throw new Error("provider write requires separate approval and execution authorisation");
  }
  return true;
}
