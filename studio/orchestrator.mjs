import { readFile } from "node:fs/promises";
import path from "node:path";

const registryPath = new URL("./registry.json", import.meta.url);
const registry = JSON.parse(await readFile(registryPath, "utf8"));

export function validateRegistry(data = registry) {
  if (!Array.isArray(data.workstreams)) throw new Error("workstreams must be an array");
  const ids = new Set(data.workstreams.map((task) => task.id));
  if (ids.size !== data.workstreams.length) throw new Error("duplicate workstream id");
  for (const task of data.workstreams) {
    for (const dep of task.dependsOn ?? []) {
      if (!ids.has(dep)) throw new Error(`unknown dependency ${dep} in ${task.id}`);
      if (dep === task.id) throw new Error(`self dependency in ${task.id}`);
    }
  }
  return true;
}

export function readyWorkstreams(states = {}) {
  const completed = new Set(Object.entries(states)
    .filter(([, state]) => state === "PASSED")
    .map(([id]) => id));
  return registry.workstreams.filter((task) =>
    (states[task.id] ?? "QUEUED") === "QUEUED" &&
    (task.dependsOn ?? []).every((id) => completed.has(id))
  );
}

export function resolveConcurrency(requested, availableWorkers, resourceBudget) {
  for (const value of [requested, availableWorkers, resourceBudget]) {
    if (!Number.isInteger(value) || value < 1) throw new Error("concurrency inputs must be positive integers");
  }
  return Math.min(requested, availableWorkers, resourceBudget, registry.maxLogicalWorkers);
}

export function workspaceFor(root, taskId) {
  if (!registry.workstreams.some((task) => task.id === taskId)) {
    throw new Error("unknown workstream");
  }
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, "studio-workspaces", taskId);
  if (!target.startsWith(resolvedRoot + path.sep)) throw new Error("workspace path escapes root");
  return target;
}

export function createPlan({ requestedConcurrency = registry.initialConcurrency, availableWorkers = 10, resourceBudget = 10 } = {}) {
  validateRegistry();
  return {
    project: registry.project,
    executionMode: "PLAN_ONLY",
    workersLaunched: 0,
    concurrency: resolveConcurrency(requestedConcurrency, availableWorkers, resourceBudget),
    tasks: registry.workstreams.map((task) => ({
      ...task,
      state: "QUEUED",
      workspace: `studio-workspaces/${task.id}`,
      approvalRequired: true,
      reviewRequired: true
    }))
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(createPlan(), null, 2));
}
