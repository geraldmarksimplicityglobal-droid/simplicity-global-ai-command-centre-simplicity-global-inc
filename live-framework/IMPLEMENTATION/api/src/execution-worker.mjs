import {
  claimExecutionJob,
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

  let result;
  try {
    result = await execute({
      organisationId: org,
      jobId: job.id,
      requesterId: job.requester_user_id,
      payload: job.payload,
      attempt: job.attempts
    });
  } catch {
    const failed = await withTenantClient(org, client =>
      failExecutionJob(client, {
        organisationId: org, jobId: job.id, workerId: worker,
        errorCode: "execution_failed", maxAttempts
      })
    );
    return Object.freeze({ status: failed?.status ?? "lease_lost", jobId: job.id });
  }

  const completed = await withTenantClient(org, client =>
    completeExecutionJob(client, {
      organisationId: org, jobId: job.id, workerId: worker,
      result: { summary: typeof result?.summary === "string" ? result.summary : "completed" }
    })
  );
  return Object.freeze({ status: completed?.status ?? "lease_lost", jobId: job.id });
}
