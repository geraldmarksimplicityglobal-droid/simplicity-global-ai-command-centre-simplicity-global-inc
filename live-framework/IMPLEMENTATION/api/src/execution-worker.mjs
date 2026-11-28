import {
  claimExecutionJob,
  heartbeatExecutionJob,
  completeExecutionJob,
  failExecutionJob
} from "./execution-jobs.mjs";

/**
 * Process one job for one tenant. The host must provide withTenantClient that
 * opens a transaction under an authenticated workload identity with membership
 * in the supplied organisation. No RLS bypass or caller-provided tenant scope
 * is permitted. execute must be a trusted host adapter that revalidates
 * capabilities and operation policy before invoking tools.
 */
export async function runExecutionWorkerOnce({
  organisationId,
  workerId,
  withTenantClient,
  execute,
  leaseSeconds = 60,
  maxAttempts = 5
} = {}) {
  if (typeof withTenantClient !== "function") throw new TypeError("withTenantClient adapter is required");
  if (typeof execute !== "function") throw new TypeError("execute adapter is required");
  const org = typeof organisationId === "string" ? organisationId.trim() : "";
  const worker = typeof workerId === "string" ? workerId.trim() : "";
  if (!org || !worker) throw new TypeError("organisationId and workerId are required");

  const job = await withTenantClient(org, client =>
    claimExecutionJob(client, { organisationId: org, workerId: worker, leaseSeconds, maxAttempts })
  );
  if (!job) return Object.freeze({ status: "idle" });

  const controller = new AbortController();
  let heartbeatLost = false;
  const heartbeatTask = (async () => {
    const intervalMs = Math.max(3000, Math.floor(leaseSeconds * 1000 / 3));
    while (!controller.signal.aborted) {
      await delay(intervalMs, controller.signal);
      if (controller.signal.aborted) break;
      try {
        const renewed = await withTenantClient(org, client =>
          heartbeatExecutionJob(client, {
            organisationId: org, jobId: job.id, workerId: worker, leaseSeconds
          })
        );
        if (!renewed) {
          heartbeatLost = true;
          controller.abort();
          break;
        }
      } catch {
        heartbeatLost = true;
        controller.abort();
        break;
      }
    }
  })();

  let result;
  try {
    result = await execute({
      organisationId: org,
      jobId: job.id,
      requesterId: job.requester_user_id,
      payload: job.payload,
      attempt: job.attempts,
      signal: controller.signal
    });
  } catch {
    controller.abort();
    await heartbeatTask;
    if (heartbeatLost) return Object.freeze({ status: "lease_lost", jobId: job.id });
    const failed = await withTenantClient(org, client =>
      failExecutionJob(client, {
        organisationId: org, jobId: job.id, workerId: worker,
        errorCode: "execution_failed", maxAttempts
      })
    );
    return Object.freeze({ status: failed?.status ?? "lease_lost", jobId: job.id });
  }
  controller.abort();
  await heartbeatTask;
  if (heartbeatLost) return Object.freeze({ status: "lease_lost", jobId: job.id });

  const completed = await withTenantClient(org, client =>
    completeExecutionJob(client, {
      organisationId: org, jobId: job.id, workerId: worker,
      result: { summary: typeof result?.summary === "string" ? result.summary : "completed" }
    })
  );
  return Object.freeze({ status: completed?.status ?? "lease_lost", jobId: job.id });
}

/**
 * Start a tenant-bound polling worker. The returned stop function requests a
 * graceful stop; deployment/supervision and workload identity provisioning
 * remain responsibilities of the host runtime.
 */
export function startExecutionWorker({
  organisationId,
  workerId,
  withTenantClient,
  execute,
  pollIntervalMs = 1500,
  leaseSeconds = 60,
  maxAttempts = 5,
  signal
} = {}) {
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 250 || pollIntervalMs > 60000) {
    throw new RangeError("pollIntervalMs must be an integer from 250 to 60000");
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  if (signal) {
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop, { once: true });
  }
  const done = (async () => {
    while (!controller.signal.aborted) {
      const result = await runExecutionWorkerOnce({
        organisationId, workerId, withTenantClient, execute, leaseSeconds, maxAttempts
      });
      if (result.status === "idle") {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, pollIntervalMs);
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
      }
    }
    return Object.freeze({ status: "stopped" });
  })();
  return Object.freeze({ stop, done });
}
