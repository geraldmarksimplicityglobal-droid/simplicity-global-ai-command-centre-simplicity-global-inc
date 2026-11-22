import { normalizeDomain } from "../domain/domain.js";
import { assertOperationAllowed } from "../core/approval-gate.js";

export class DnsModule {
  constructor({ provider, mode = "mock" }) {
    this.provider = provider;
    this.mode = mode;
  }
  async inspect(domain) {
    return this.provider.getDnsRecords(normalizeDomain(domain));
  }
  async writeRecord(domain, record, approval) {
    const normalized = normalizeDomain(domain);
    assertOperationAllowed({ operation: "dns.create", target: normalized, mode: this.mode, approval });
    throw new Error(`DNS write adapter is not implemented for ${normalized}`);
  }
}
