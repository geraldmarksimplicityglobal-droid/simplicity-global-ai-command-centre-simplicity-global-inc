import path from "node:path";

const DEFAULT_LIMITS = Object.freeze({
  maxArgs: 64,
  maxArgLength: 4096,
  maxTimeoutMs: 120000,
  maxOutputBytes: 1048576
});

const DEFAULT_DENIED_ENV = new Set([
  "NODE_OPTIONS", "BASH_ENV", "ENV", "GIT_ASKPASS", "SSH_ASKPASS",
  "AWS_SECRET_ACCESS_KEY", "AZURE_CLIENT_SECRET", "GOOGLE_APPLICATION_CREDENTIALS"
]);

function nonEmpty(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(field + " must be a non-empty string");
  }
  return value.trim();
}

function isWithin(root, candidate) {
  const api = /^[A-Za-z]:/.test(root) || root.startsWith("\\\\") ? path.win32 : path.posix;
  const base = api.resolve(root);
  const target = api.resolve(candidate);
  const relative = api.relative(base, target);
  return relative === "" || (!relative.startsWith("..") && !api.isAbsolute(relative));
}

/**
 * Validate a proposed adapter invocation without executing it.
 * Callers must still use spawn(executable, args, { shell: false }) and enforce
 * OS-level isolation, timeout, output limits and cancellation.
 */
export function validateInvocation(request, policy) {
  if (!request || typeof request !== "object") throw new TypeError("request required");
  if (!policy || typeof policy !== "object") throw new TypeError("policy required");

  const adapterId = nonEmpty(request.adapterId, "adapterId");
  const operation = nonEmpty(request.operation, "operation");
  const executable = nonEmpty(request.executable, "executable");
  const workingDirectory = nonEmpty(request.workingDirectory, "workingDirectory");

  if (!Array.isArray(policy.adapters) || !policy.adapters.some(item =>
    item.id === adapterId && item.executable === executable &&
    Array.isArray(item.operations) && item.operations.includes(operation)
  )) {
    throw new Error("adapter, executable or operation is not allowlisted");
  }

  if (!Array.isArray(policy.workspaceRoots) || !policy.workspaceRoots.some(root =>
    typeof root === "string" && isWithin(root, workingDirectory)
  )) {
    throw new Error("working directory is outside approved workspace roots");
  }

  const args = request.args ?? [];
  if (!Array.isArray(args) || args.length > DEFAULT_LIMITS.maxArgs ||
      args.some(arg => typeof arg !== "string" || arg.length > DEFAULT_LIMITS.maxArgLength ||
        arg.includes("\u0000"))) {
    throw new TypeError("arguments must be a bounded array of strings");
  }

  const timeoutMs = request.timeoutMs ?? 30000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 ||
      timeoutMs > (policy.maxTimeoutMs ?? DEFAULT_LIMITS.maxTimeoutMs)) {
    throw new RangeError("timeout is outside the permitted range");
  }

  const maxOutputBytes = request.maxOutputBytes ?? 262144;
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 ||
      maxOutputBytes > (policy.maxOutputBytes ?? DEFAULT_LIMITS.maxOutputBytes)) {
    throw new RangeError("output limit is outside the permitted range");
  }

  const requiredApproval = policy.approvalRequiredOperations ?? [];
  if (requiredApproval.includes(operation)) {
    const approval = request.approval;
    if (!approval || approval.status !== "approved" ||
        typeof request.taskId !== "string" || request.taskId.trim() === "" ||
        approval.taskId !== request.taskId ||
        !Array.isArray(approval.operations) ||
        !approval.operations.includes(operation) ||
        !Number.isFinite(approval.expiresAt) ||
        approval.expiresAt <= Date.now()) {
      throw new Error("current, scoped approval is required for this operation");
    }
  }

  const environment = {};
  const allowedEnvironment = new Set(policy.allowedEnvironment ?? []);
  for (const [key, value] of Object.entries(request.environment ?? {})) {
    if (!allowedEnvironment.has(key) || DEFAULT_DENIED_ENV.has(key)) {
      throw new Error("environment variable is not permitted: " + key);
    }
    if (typeof value !== "string" || value.includes("\u0000")) {
      throw new TypeError("environment values must be strings without NUL bytes");
    }
    environment[key] = value;
  }

  return Object.freeze({
    adapterId,
    operation,
    executable,
    args: Object.freeze([...args]),
    workingDirectory,
    timeoutMs,
    maxOutputBytes,
    environment: Object.freeze(environment),
    shell: false
  });
}

export function createAdapterRegistry(adapters = []) {
  const registry = new Map();
  for (const adapter of adapters) {
    if (!adapter || typeof adapter !== "object") throw new TypeError("adapter must be an object");
    const id = nonEmpty(adapter.id, "adapter.id");
    if (registry.has(id)) throw new Error("duplicate adapter id: " + id);
    registry.set(id, Object.freeze({
      id,
      executable: nonEmpty(adapter.executable, "adapter.executable"),
      versionProbe: Object.freeze([...(adapter.versionProbe ?? [])]),
      operations: Object.freeze([...(adapter.operations ?? [])]),
      permissionTier: adapter.permissionTier ?? "read-only"
    }));
  }
  return Object.freeze({
    list: () => [...registry.values()],
    get: id => registry.get(id) ?? null
  });
}
