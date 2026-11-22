import { normalizeDomain, domainRecord } from "../domain/domain.js";
import { assertOperationAllowed } from "../core/approval-gate.js";
import { createAuditEvent } from "../core/audit.js";

export class RegistrarModule {
  constructor({ provider, mode = "mock", audit = () => {} }) {
    if (!provider) throw new TypeError("provider is required");
    this.provider = provider;
    this.mode = mode;
    this.audit = audit;
  }
  async inspect(domain) {
    const normalized = normalizeDomain(domain);
    const result = await this.provider.getDomainStatus(normalized);
    this.audit(createAuditEvent({ action: "domain.inspect", target: normalized, outcome: "success", details: { provider: this.provider.id } }));
    return { record: domainRecord(normalized, result.status), providerResult: result };
  }
  async register(domain, approval) {
    const normalized = normalizeDomain(domain);
    assertOperationAllowed({ operation: "domain.register", mode: this.mode, approval });
    throw new Error("Registration adapter is not implemented; no purchase can be performed");
  }
}
