import { ANDROID_TERMUX_ADAPTER, createAndroidAdapterRegistry } from "../../ANDROID-MT-MANAGER/src/android-policy.mjs";

export { ANDROID_TERMUX_ADAPTER };

export function createAgenticAndroidAdapter(adapters = [ANDROID_TERMUX_ADAPTER]) {
  const registry = createAndroidAdapterRegistry(adapters);
  return Object.freeze({
    list: () => registry.list(),
    get: id => registry.get(id)
  });
}