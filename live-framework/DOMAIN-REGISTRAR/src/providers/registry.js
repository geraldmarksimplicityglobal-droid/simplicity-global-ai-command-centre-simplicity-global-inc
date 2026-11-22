import { validateProvider } from "./provider-contract.js";

export class ProviderRegistry {
  #providers = new Map();
  register(provider) {
    validateProvider(provider);
    if (this.#providers.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    this.#providers.set(provider.id, provider);
  }
  get(id) {
    const provider = this.#providers.get(id);
    if (!provider) throw new Error(`Provider not configured: ${id}`);
    return provider;
  }
  list() {
    return [...this.#providers.keys()];
  }
}
