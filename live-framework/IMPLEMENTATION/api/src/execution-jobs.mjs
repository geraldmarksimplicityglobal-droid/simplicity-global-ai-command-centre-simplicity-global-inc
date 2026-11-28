const RISKS = new Set(["read_only", "reversible"]);
const MAX_CAPABILITIES = 100;

function text(value, field, max = 500) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new TypeError(field + " must be a non-empty string of at most " + max + " characters");
  }
  return value.trim();
}

export function validateExecutionJob(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("execution job input required");
  }
  const allowed = new Set(["objective", "capabilities", "risk", "idempotencyKey"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new TypeError("unsupported field: " + key);
  }
  const objective = text(input.objective, "objective", 4000);
  if (!Array.isArray(input.capabilities) || input.capabilities.length > MAX_CAPABILITIES) {
    throw new TypeError("capabilities must be an array of at most 100 entries");
  }
  const capabilities = [...new Set(input.capabilities.map(value => text(value, "capability", 200)))];
  const risk = input.risk ?? "read_only";
  if (!RISKS.has(risk)) {
    throw new TypeError("background jobs currently allow only read_only or reversible operations");
  }
  const idempotencyKey = input.idempotencyKey == null ? null : text(input.idempotencyKey, "idempotencyKey", 200);
  return Object.freeze({ objective, capabilities, risk, idempotencyKey });
}

function safeJob(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    status: row.status,
    createdAt: row.created_at ?? null
  });
}

export async function enqueueExecutionJob(client, { organisationId, requesterId, input } = {}) {
  const org = text(organisationId, "organisationId", 100);
  const requester = text(requesterId, "requesterId", 100);
  const job = validateExecutionJob(input);
  const payload = { objective: job.objective, capabilities: job.capabilities, risk: job.risk };
  const inserted = await client.query(
    `INSERT INTO aif_execution_jobs
       (organisation_id,requester_user_id,idempotency_key,payload,status)
     VALUES ($1,$2,$3,$4::jsonb,'queued')
     ON CONFLICT (organisation_id,idempotency_key) WHERE idempotency_key IS NOT NULL
     DO NOTHING
     RETURNING id,status,created_at`,
    [org, requester, job.idempotencyKey, JSON.stringify(payload)]
  );
  if (inserted.rows[0]) return safeJob(inserted.rows[0]);
  if (job.idempotencyKey) {
    const existing = await client.query(
      "SELECT id,status,created_at FROM aif_execution_jobs WHERE organisation_id=$1 AND requester_user_id=$2 AND idempotency_key=$3 AND payload=$4::jsonb",
      [org, requester, job.idempotencyKey, JSON.stringify(payload)]
    );
    if (existing.rows[0]) return Object.freeze({ ...safeJob(existing.rows[0]), idempotentReplay: true });
  }
  throw new Error("execution_job_conflict");
}

export async function claimExecutionJob(client, {
  organisationId, workerId, leaseSeconds = 60, maxAttempts = 5
} = {}) {
  const org = text(organisationId, "organisationId", 100);
  const worker = text(workerId, "workerId", 200);
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 10 || leaseSeconds > 900) {
    throw new RangeError("leaseSeconds must be an integer from 10 to 900");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
    throw new RangeError("maxAttempts must be an integer from 1 to 20");
  }
  const result = await client.query(
    `WITH candidate AS (
       SELECT id FROM aif_execution_jobs
       WHERE organisation_id=$1
         AND attempts < $4
         AND (status='queued' OR (status='running' AND lease_until < now()))
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE aif_execution_jobs AS job
       SET status='running', worker_id=$2, lease_until=now() + ($3::int * interval '1 second'),
           attempts=job.attempts+1, updated_at=now()
     FROM candidate
     WHERE job.id=candidate.id
     RETURNING job.id,job.organisation_id,job.requester_user_id,job.payload,job.attempts,job.lease_until`,
    [org, worker, leaseSeconds, maxAttempts]
  );
  return result.rows[0] ?? null;
}

export async function completeExecutionJob(client, { organisationId, jobId, workerId, result = {} } = {}) {
  const org = text(organisationId, "organisationId", 100);
  const id = text(jobId, "jobId", 100);
  const worker = text(workerId, "workerId", 200);
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new TypeError("result must be an object");
  const summary = result.summary == null ? "" : text(result.summary, "result.summary", 1000);
  const updated = await client.query(
    `UPDATE aif_execution_jobs
       SET status='succeeded',result=$4::jsonb,worker_id=NULL,lease_until=NULL,updated_at=now(),completed_at=now()
     WHERE organisation_id=$1 AND id=$2 AND worker_id=$3 AND status='running' AND cancel_requested_at IS NULL AND lease_until > now()
     RETURNING id,status`,
    [org, id, worker, JSON.stringify({ summary })]
  );
  return safeJob(updated.rows[0]);
}

export async function failExecutionJob(client, {
  organisationId, jobId, workerId, errorCode = "execution_failed", maxAttempts = 5
} = {}) {
  const org = text(organisationId, "organisationId", 100);
  const id = text(jobId, "jobId", 100);
  const worker = text(workerId, "workerId", 200);
  const code = /^[a-z0-9_]{1,80}$/.test(errorCode) ? errorCode : "execution_failed";
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
    throw new RangeError("maxAttempts must be an integer from 1 to 20");
  }
  const updated = await client.query(
    `UPDATE aif_execution_jobs
       SET status=CASE WHEN attempts < $5 THEN 'queued' ELSE 'failed' END,
           last_error_code=$4,worker_id=NULL,lease_until=NULL,updated_at=now(),
           completed_at=CASE WHEN attempts < $5 THEN NULL ELSE now() END
     WHERE organisation_id=$1 AND id=$2 AND worker_id=$3 AND status='running' AND lease_until > now()
     RETURNING id,status`,
    [org, id, worker, code, maxAttempts]
  );
  return safeJob(updated.rows[0]);
}

export async function blockExecutionJob(client, {
  organisationId, jobId, workerId, errorCode = "policy_denied",
  summary = "Task requires an approval or authorization step"
} = {}) {
  const org = text(organisationId, "organisationId", 100);
  const id = text(jobId, "jobId", 100);
  const worker = text(workerId, "workerId", 200);
  if (!/^(approval_required|authorization_required|connector_required|policy_denied)$/.test(errorCode)) {
    throw new TypeError("errorCode must identify a supported blocked outcome");
  }
  const safeSummary = text(summary, "summary", 1000);
  const updated = await client.query(
    `UPDATE aif_execution_jobs
       SET status='blocked',last_error_code=$4,result=$5::jsonb,
           worker_id=NULL,lease_until=NULL,updated_at=now(),completed_at=now()
     WHERE organisation_id=$1 AND id=$2 AND worker_id=$3
       AND status='running' AND lease_until > now()
     RETURNING id,status,created_at`,
    [org, id, worker, errorCode, JSON.stringify({ summary: safeSummary })]
  );
  return safeJob(updated.rows[0]);
}

export async function cancelExecutionJob(client, { organisationId, jobId, requesterId } = {}) {
  const org = text(organisationId, "organisationId", 100);
  const id = text(jobId, "jobId", 100);
  const requester = text(requesterId, "requesterId", 100);
  const updated = await client.query(
    `UPDATE aif_execution_jobs
       SET status=CASE WHEN status='queued' THEN 'cancelled' ELSE status END,
           cancel_requested_at=CASE WHEN status='running' THEN COALESCE(cancel_requested_at,now()) ELSE cancel_requested_at END,
           worker_id=CASE WHEN status='queued' THEN NULL ELSE worker_id END,
           lease_until=CASE WHEN status='queued' THEN NULL ELSE lease_until END,
           updated_at=now(),
           completed_at=CASE WHEN status='queued' THEN now() ELSE completed_at END
     WHERE organisation_id=$1 AND id=$2 AND requester_user_id=$3
       AND (status='queued' OR (status='running' AND cancel_requested_at IS NULL))
     RETURNING id,CASE WHEN status='running' AND cancel_requested_at IS NOT NULL
                       THEN 'cancellation_requested' ELSE status END AS status,created_at`,
    [org, id, requester]
  );
  return safeJob(updated.rows[0]);
}

export async function finishCancelledExecutionJob(client, {
  organisationId, jobId, workerId
} = {}) {
  const org = text(organisationId, "organisationId", 100);
  const id = text(jobId, "jobId", 100);
  const worker = text(workerId, "workerId", 200);
  const updated = await client.query(
    `UPDATE aif_execution_jobs
       SET status='cancelled',worker_id=NULL,lease_until=NULL,updated_at=now(),completed_at=now(),
           result=\x27{"summary":"Cancelled by requester"}\x27::jsonb
     WHERE organisation_id=$1 AND id=$2 AND worker_id=$3
       AND status='running' AND cancel_requested_at IS NOT NULL AND lease_until > now()
     RETURNING id,status,created_at`,
    [org, id, worker]
  );
  return safeJob(updated.rows[0]);
}

export async function heartbeatExecutionJob(client, {
  organisationId, jobId, workerId, leaseSeconds = 60
} = {}) {
  const org = text(organisationId, "organisationId", 100);
  const id = text(jobId, "jobId", 100);
  const worker = text(workerId, "workerId", 200);
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 10 || leaseSeconds > 900) {
    throw new RangeError("leaseSeconds must be an integer from 10 to 900");
  }
  const updated = await client.query(
    `UPDATE aif_execution_jobs
       SET lease_until=now() + ($4::int * interval '1 second'),updated_at=now()
     WHERE organisation_id=$1 AND id=$2 AND worker_id=$3 AND status='running' AND lease_until > now()
     RETURNING id,status,lease_until`,
    [org, id, worker, leaseSeconds]
  );
  return updated.rows[0] ?? null;
}
