import { createMockProvider } from "./providers/mock-provider.js";
import { ProviderRegistry } from "./providers/registry.js";
import { RegistrarModule } from "./modules/registrar.js";
import { DnsModule } from "./modules/dns.js";
import { bingProperty } from "./modules/bing-webmaster.js";
import { sitemapEndpoint } from "./modules/sitemap.js";
import { targetStatus } from "./adapters/targets.js";

export function createDomainSystem({ mode = "mock", audit = () => {} } = {}) {
  if (mode !== "mock") throw new Error("Only mock mode is currently supported");
  const providers = new ProviderRegistry();
  const mock = createMockProvider();
  providers.register(mock);
  return Object.freeze({
    mode,
    providers,
    registrar: new RegistrarModule({ provider: mock, mode, audit }),
    dns: new DnsModule({ provider: mock, mode }),
    bingProperty,
    sitemapEndpoint,
    targetStatus
  });
}
