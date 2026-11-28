import { pathToFileURL } from "node:url";
import { isAbsolute, resolve } from "node:path";
import { startExecutionWorker } from "./execution-worker.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORKER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;

function boundedInteger(value, fallback, minimum, maximum, field) {
  if (value == null || value === "") return fallback;
  if (!/^[0-9]+$/.test(String(value))) throw new TypeError(field + " must be an integer");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RangeError(field + " must be between " + minimum + " and " + maximum);
  }
  return parsed;
}

/** Parse deployment-only settings; never reads or returns credential values. */
export function parseWorkerEnvironment(env = process.env) {
  const adapterModule = typeof env.SG_WORKER_ADAPTER_MODULE === "string"
    ? env.SG_WORKER_ADAPTER_MODULE.trim() : "";
  const organisationId = typeof env.SG_WORKER_ORGANISATION_ID === "string"
    ? env.SG_WORKER_ORGANISATION_ID.trim() : "";
  const workerId = typeof env.SG_WORKER_ID === "string" ? env.SG_WORKER_ID.trim() : "";
  if (!adapterModule || !isAbsolute(adapterModule)) {
    throw new TypeError("SG_WORKER_ADAPTER_MODULE must be an absolute path to a trusted host adapter");
  }
  if (!UUID.test(organisationId)) throw new TypeError("SG_WORKER_ORGANISATION_ID must be a UUID");
  if (!WORKER_ID.test(workerId)) throw new TypeError("SG_WORKER_ID has an invalid format");
  return Object.freeze({
    adapterModule: resolve(adapterModule),
    organisationId,
    workerId,
    pollIntervalMs: boundedInteger(env.SG_WORKER_POLL_INTERVAL_MS, 1500, 250, 60000, "SG_WORKER_POLL_INTERVAL_MS"),
    leaseSeconds: boundedInteger(env.SG_WORKER_LEASE_SECONDS, 60, 10, 900, "SG_WORKER_LEASE_SECONDS"),
    maxAttempts: boundedInteger(env.SG_WORKER_MAX_ATTEMPTS, 5, 1, 20, "SG_WORKER_MAX_ATTEMPTS")
  });
}

/**
 * Start only after a separately deployed trusted adapter verifies workload
 * identity and provides tenant-scoped DB access plus a policy-enforcing tool
 * executor. This module deliberately does not provision credentials or infer
 * tenant membership.
 */
export async function startWorkerHost({
  env = process.env,
  loadAdapter = modulePath => import(pathToFileURL(modulePath).href),
  installSignalHandlers = true,
  signal
} = {}) {
  const config = parseWorkerEnvironment(env);
  const adapter = await loadAdapter(config.adapterModule);
  if (!adapter || typeof adapter.verifyWorkerIdentity !== "function") {
    throw new TypeError("trusted host adapter must export verifyWorkerIdentity");
  }
  if (typeof adapter.withTenantClient !== "function" || typeof adapter.execute !== "function") {
    throw new TypeError("trusted host adapter must export withTenantClient and execute");
  }
  const identity = await adapter.verifyWorkerIdentity({
    organisationId: config.organisationId,
    workerId: config.workerId
  });
  if (!identity || identity.verified !== true ||
      identity.organisationId !== config.organisationId ||
      identity.workerId !== config.workerId) {
    throw new Error("trusted host adapter did not verify the exact worker identity");
  }

  const controller = new AbortController();
  const stop = () => controller.abort();
  if (signal) {
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop, { once: true });
  }
  if (installSignalHandlers) {
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  }

  const worker = startExecutionWorker({
    organisationId: config.organisationId,
    workerId: config.workerId,
    withTenantClient: adapter.withTenantClient,
    execute: adapter.execute,
    pollIntervalMs: config.pollIntervalMs,
    leaseSeconds: config.leaseSeconds,
    maxAttempts: config.maxAttempts,
    signal: controller.signal
  });
  const done = worker.done.finally(async () => {
    if (installSignalHandlers) {
      process.removeListener("SIGTERM", stop);
      process.removeListener("SIGINT", stop);
    }
    if (signal) signal.removeEventListener("abort", stop);
    if (typeof adapter.close === "function") await adapter.close();
  });
  if (controller.signal.aborted) return await done;
  return Object.freeze({
    status: "running",
    worker: Object.freeze({ stop: worker.stop, done })
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await startWorkerHost();
    if (result.status === "running") {
      await result.worker.done;
    }
  } catch {
    // Do not print adapter errors, connection strings, or credential material.
    process.stderr.write("SG-AIF worker startup failed: verify deployment configuration and trusted host adapter.\n");
    process.exitCode = 1;
  }
}
