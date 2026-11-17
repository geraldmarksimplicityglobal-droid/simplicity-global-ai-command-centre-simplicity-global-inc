export const DEFAULT_CONCURRENCY = 10;
export const MAX_LOGICAL_WORKERS = 1000;

export const studioTasks = Object.freeze([
  { id: "ST-001", studio: "architecture", objective: "Define system architecture and stable interfaces", dependencies: [] },
  { id: "ST-002", studio: "android", objective: "Inspect Android application and native lifecycle", dependencies: ["ST-001"] },
  { id: "ST-003", studio: "windows", objective: "Inspect Windows workstation and build environment", dependencies: ["ST-001"] },
  { id: "ST-004", studio: "dsh", objective: "Inspect upstream DeepSeek Harness and runtime compatibility", dependencies: ["ST-001"] },
  { id: "ST-005", studio: "codex-bridge", objective: "Specify tool routing and workspace adapter", dependencies: ["ST-001"] },
  { id: "ST-006", studio: "governance", objective: "Specify approval, policy and audit controls", dependencies: ["ST-001"] },
  { id: "ST-007", studio: "security", objective: "Review threat model and security boundaries", dependencies: ["ST-002", "ST-004", "ST-005", "ST-006"] },
  { id: "ST-008", studio: "testing", objective: "Define automated and device acceptance tests", dependencies: ["ST-002", "ST-003", "ST-004", "ST-005", "ST-006"] },
  { id: "ST-009", studio: "build", objective: "Validate toolchain and build/release requirements", dependencies: ["ST-002", "ST-003", "ST-004"] },
  { id: "ST-010", studio: "documentation", objective: "Maintain implementation and evidence documentation", dependencies: ["ST-001"] }
].map(task => Object.freeze({
  ...task,
  workspace: `workspaces/${task.id.toLowerCase()}-${task.studio}`,
  mode: "READ_ONLY",
  requiresReview: true,
  state: "QUEUED"
})));
