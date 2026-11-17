export const INITIAL_CONCURRENCY = 10;
export const MAX_LOGICAL_WORKERS = 1000;

// These ten discovery workstreams are intentionally independent.
// Integration dependencies are introduced only after discovery evidence is reviewed.
export const studioTasks = Object.freeze([
  { id: "ST-001", studio: "architecture", objective: "Define architecture and stable interface contracts.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-002", studio: "android", objective: "Inspect Android and Kotlin runtime requirements.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-003", studio: "windows", objective: "Inspect Windows engineering environment requirements.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-004", studio: "dsh", objective: "Inspect DeepSeek Harness source, runtime and licensing.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-005", studio: "codex-bridge", objective: "Specify SG-CODEX tool and worker adapter contracts.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-006", studio: "governance", objective: "Specify approval, policy and audit controls.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-007", studio: "security", objective: "Review threat model and security boundaries.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-008", studio: "testing", objective: "Define unit, integration and device acceptance tests.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-009", studio: "build", objective: "Validate toolchain and prepare reproducible build plan.", dependencies: [], mode: "READ_ONLY", requiresReview: true },
  { id: "ST-010", studio: "documentation", objective: "Maintain technical documentation and evidence register.", dependencies: [], mode: "READ_ONLY", requiresReview: true }
]);

export function validateRegistry(tasks = studioTasks) {
  const ids = new Set(tasks.map(task => task.id));
  if (ids.size !== tasks.length) throw new Error("Duplicate task ID");
  for (const task of tasks) {
    if (!task.id || !task.studio || !task.objective) throw new Error("Task is missing required metadata");
    for (const dependency of task.dependencies) {
      if (!ids.has(dependency)) throw new Error(`Unknown dependency ${dependency} in ${task.id}`);
      if (dependency === task.id) throw new Error(`Self-dependency in ${task.id}`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(tasks.map(task => [task.id, task]));
  function visit(id) {
    if (visiting.has(id)) throw new Error("Dependency cycle detected");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependencies) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const task of tasks) visit(task.id);
  return true;
}
