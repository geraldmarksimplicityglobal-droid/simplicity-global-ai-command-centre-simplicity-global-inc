import { assertNonEmpty } from "./policy.js";

const requiredReadMethods = ["listWorkflows", "getWorkflow", "getRunHistory"];

export function assertReadOnlyAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new TypeError("A Zapier MCP adapter is required");
  for (const method of requiredReadMethods) {
    if (typeof adapter[method] !== "function") throw new TypeError("Adapter must implement " + method);
  }
  return adapter;
}

export function normalizeWorkflow(workflow) {
  if (!workflow || typeof workflow !== "object") throw new TypeError("Invalid workflow payload");
  assertNonEmpty(String(workflow.id ?? ""), "workflow.id");
  return Object.freeze({
    id: String(workflow.id),
    name: String(workflow.name ?? "Untitled workflow"),
    status: String(workflow.status ?? "unknown"),
    updatedAt: workflow.updatedAt ?? null,
    source: "authorized-adapter"
  });
}

export function normalizeRun(run) {
  if (!run || typeof run !== "object") throw new TypeError("Invalid run payload");
  return Object.freeze({
    id: String(run.id ?? "unknown"),
    status: String(run.status ?? "unknown"),
    errorCode: run.errorCode == null ? null : String(run.errorCode),
    errorSummary: run.errorSummary == null ? null : String(run.errorSummary).slice(0, 500),
    startedAt: run.startedAt ?? null
  });
}
