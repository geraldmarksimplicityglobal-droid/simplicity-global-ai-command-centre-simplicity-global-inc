import test from "node:test";
import assert from "node:assert/strict";
import { WalletAdapterRegistry } from "../src/adapter-registry.js";
import { MockWalletAdapter } from "../../adapters/mock/src/mock-adapter.js";

test("registers and retrieves an explicitly supplied mock adapter", () => {
  const registry = new WalletAdapterRegistry();
  const adapter = new MockWalletAdapter();
  registry.register(adapter);
  assert.equal(registry.get(adapter.network.id), adapter);
  assert.equal(registry.listNetworks().length, 1);
});

test("rejects duplicate network registrations", () => {
  const registry = new WalletAdapterRegistry();
  const adapter = new MockWalletAdapter();
  registry.register(adapter);
  assert.throws(() => registry.register(adapter), /already registered/);
});
