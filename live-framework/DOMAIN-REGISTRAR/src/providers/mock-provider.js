import { normalizeDomain } from "../domain/domain.js";

export function createMockProvider() {
  return Object.freeze({
    id: "mock",
    mode: "mock",
    getCapabilities() {
      return Object.freeze({ readDomain: true, readDns: true, register: false, renew: false, transfer: false, writeDns: false, updateNameservers: false });
    },
    async getDomainStatus(domain) {
      return { domain: normalizeDomain(domain), status: "unknown", source: "mock", verified: false };
    },
    async getDnsRecords(domain) {
      return { domain: normalizeDomain(domain), records: [], source: "mock" };
    }
  });
}
