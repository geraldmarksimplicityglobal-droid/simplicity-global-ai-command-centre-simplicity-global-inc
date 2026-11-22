export const MODULES = Object.freeze([
  ["SG-DOM-001","Registrar Core","core","mock-only"],
  ["SG-DOM-002","Domain Registry","domain","local-model"],
  ["SG-DOM-003","Availability","registrar","mock-only"],
  ["SG-DOM-004","Registration","registrar","disabled"],
  ["SG-DOM-005","Renewal","registrar","disabled"],
  ["SG-DOM-006","Transfer","registrar","disabled"],
  ["SG-DOM-007","DNS Manager","dns","read-only-mock"],
  ["SG-DOM-008","Nameservers","dns","disabled"],
  ["SG-DOM-009","SSL/TLS","infrastructure","disabled"],
  ["SG-DOM-010","Hosting","infrastructure","unconfigured"],
  ["SG-DOM-011","Website Manager","web","reference-only"],
  ["SG-DOM-012","Bing Webmaster","seo","unconfigured"],
  ["SG-DOM-013","Sitemap","seo","local-validation"],
  ["SG-DOM-014","Postman","integration","manual-only"],
  ["SG-DOM-015","Provider Connectors","integration","mock-only"],
  ["SG-DOM-016","Billing","finance","disabled"],
  ["SG-DOM-017","Identity","security","design-only"],
  ["SG-DOM-018","Permissions","security","design-only"],
  ["SG-DOM-019","Audit","governance","in-memory"],
  ["SG-DOM-020","Notifications","operations","disabled"],
  ["SG-DOM-021","Automation","operations","disabled"],
  ["SG-DOM-022","Backup","operations","design-only"],
  ["SG-DOM-023","Monitoring","operations","design-only"],
  ["SG-DOM-024","Administration","governance","local-only"]
].map(([id,name,area,state]) => Object.freeze({id,name,area,state})));

export function listModules() {
  return MODULES.map((module) => ({...module}));
}

export function getModule(id) {
  return MODULES.find((module) => module.id === id) ?? null;
}
