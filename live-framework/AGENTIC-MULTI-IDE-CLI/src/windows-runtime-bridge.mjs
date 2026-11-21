import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { spawn as nodeSpawn } from "node:child_process";
import path from "node:path";
import { realpath } from "node:fs/promises";
import { validateInvocation } from "./runtime-policy.mjs";

const MAX_BODY_BYTES = 65536;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ""));
  const b = Buffer.from(String(right ?? ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(response, status, body) {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": payload.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(payload);
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("request body too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid JSON body"), { statusCode: 400 });
  }
}

function collectOutput(child, limit) {
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let captured = 0;
  let overflow = false;
  const append = (current, chunk) => {
    const remaining = Math.max(0, limit - captured);
    const accepted = chunk.subarray(0, remaining);
    captured += accepted.length;
    if (accepted.length < chunk.length) overflow = true;
    return Buffer.concat([current, accepted]);
  };
  child.stdout?.on("data", chunk => { stdout = append(stdout, chunk); if (overflow) child.kill(); });
  child.stderr?.on("data", chunk => { stderr = append(stderr, chunk); if (overflow) child.kill(); });
  return () => ({ stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), outputTruncated: overflow });
}

async function resolveWorkingDirectory(candidate, roots) {
  const realCandidate = await realpath(candidate);
  const realRoots = await Promise.all(roots.map(root => realpath(root)));
  const inside = realRoots.some(root => {
    const relative = path.relative(root, realCandidate);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
  if (!inside) throw new Error("resolved working directory is outside approved workspace roots");
  return realCandidate;
}

function executeChild(invocation, spawnProcess = nodeSpawn) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawnProcess(invocation.executable, [...invocation.args], {
      cwd: invocation.workingDirectory,
      env: { ...invocation.environment },
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const output = collectOutput(child, invocation.maxOutputBytes);
    const timer = setTimeout(() => {
      child.kill();
      finish({ timedOut: true, exitCode: null, signal: null, ...output() });
    }, invocation.timeoutMs);
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    child.once("error", error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => finish({
      timedOut: false,
      exitCode: code,
      signal,
      ...output()
    }));
  });
}

/**
 * Create a loopback-only runtime bridge.
 *
 * Trust services are mandatory and must be backed by authenticated server-side
 * identity/approval storage. This bridge deliberately refuses to start without
 * them. It is not an OS sandbox: production use also requires a restricted OS
 * account/container, filesystem ACLs and network egress controls.
 */
export function createWindowsRuntimeBridge({
  host = "127.0.0.1",
  port = 0,
  token,
  policy,
  adapters,
  resolveApproval,
  authorizeExecution,
  audit,
  spawnProcess = nodeSpawn
} = {}) {
  if (!LOOPBACK_HOSTS.has(host)) throw new Error("runtime bridge must bind to loopback only");
  if (typeof token !== "string" || token.length < 32) throw new Error("a 32-character runtime token is required");
  if (!policy || !Array.isArray(policy.workspaceRoots)) throw new Error("runtime policy with workspace roots is required");
  if (typeof resolveApproval !== "function" || typeof authorizeExecution !== "function" || typeof audit !== "function") {
    throw new Error("trusted approval, execution-authorization and durable audit services are required");
  }

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        return send(response, 200, { status: "ready", mode: "authenticated-loopback" });
      }
      const authorization = request.headers.authorization ?? "";
      const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!safeEqual(supplied, token)) return send(response, 401, { error: "unauthorized" });

      if (request.method === "GET" && request.url === "/v1/adapters") {
        return send(response, 200, { adapters: adapters?.list?.() ?? [] });
      }
      if (request.method !== "POST" || request.url !== "/v1/execute") {
        return send(response, 404, { error: "not found" });
      }

      const requestBody = await readJson(request);
      if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
        return send(response, 400, { error: "request object required" });
      }
      const { approval: _untrustedApproval, ...untrustedInvocation } = requestBody;
      const taskId = typeof requestBody.taskId === "string" ? requestBody.taskId : "";
      if (!taskId) return send(response, 400, { error: "taskId required" });

      const approval = await resolveApproval({ taskId, operation: requestBody.operation });
      const proposedInvocation = validateInvocation({
        ...untrustedInvocation,
        taskId,
        approval
      }, policy);
      const executionGrant = await authorizeExecution({
        taskId,
        operation: proposedInvocation.operation,
        adapterId: proposedInvocation.adapterId,
        resource: proposedInvocation.workingDirectory
      });
      if (!executionGrant || executionGrant.allowed !== true) {
        await audit({ type: "runtime.execution_denied", taskId, adapterId: proposedInvocation.adapterId });
        return send(response, 403, { error: "execution not authorized" });
      }

      const invocation = {
        ...proposedInvocation,
        workingDirectory: await resolveWorkingDirectory(
          proposedInvocation.workingDirectory,
          policy.workspaceRoots
        )
      };
      await audit({
        type: "runtime.execution_started",
        taskId,
        adapterId: invocation.adapterId,
        operation: invocation.operation,
        workingDirectory: invocation.workingDirectory
      });
      const result = await executeChild(invocation, spawnProcess);
      await audit({
        type: "runtime.execution_finished",
        taskId,
        adapterId: invocation.adapterId,
        operation: invocation.operation,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        outputTruncated: result.outputTruncated
      });
      return send(response, 200, result);
    } catch (error) {
      const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
      const message = status < 500 ? error.message : "runtime service unavailable";
      return send(response, status, { error: message });
    }
  });

  return {
    server,
    listen: () => new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        server.removeListener("error", reject);
        resolve(server.address());
      });
    }),
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  };
}
