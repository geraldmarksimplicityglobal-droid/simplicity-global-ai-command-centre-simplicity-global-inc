import type { NetworkDescriptor, WalletReadAdapter } from "./types.js";

/**
 * In-memory registry for explicitly supplied read-only adapters.
 * Registration never discovers providers or opens network connections.
 */
export class WalletAdapterRegistry {
  readonly #adapters = new Map<string, WalletReadAdapter>();

  register(adapter: WalletReadAdapter): void {
    const networkId = adapter.network.id.trim();
    if (!networkId) throw new Error("Adapter network id is required.");
    if (this.#adapters.has(networkId)) {
      throw new Error(`An adapter is already registered for ${networkId}.`);
    }
    this.#adapters.set(networkId, adapter);
  }

  get(networkId: string): WalletReadAdapter | undefined {
    return this.#adapters.get(networkId);
  }

  listNetworks(): readonly NetworkDescriptor[] {
    return [...this.#adapters.values()].map((adapter) => adapter.network);
  }
}
