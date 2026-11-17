export type TaskState =
  | "QUEUED" | "READY" | "RUNNING" | "REVIEW"
  | "BLOCKED" | "PASSED" | "FAILED";

export type TaskMode = "READ_ONLY" | "PATCH_PROPOSAL";

export interface StudioTask {
  id: string;
  studio: string;
  workspace: string;
  dependencies: string[];
  state: TaskState;
  mode: TaskMode;
  requiresReview: boolean;
}

export interface CapacitySnapshot {
  availableWorkers: number;
  resourceBudget: number;
  requestedWorkers: number;
}

export const POLICY = Object.freeze({
  maxLogicalWorkers: 1000,
  initialConcurrency: 10,
  maxConcurrency: 1000,
  isolatedWorkspacePerTask: true,
  sharedWrites: false,
  requireReviewBeforeMerge: true,
  requireApprovalForExecution: true,
  defaultMode: "READ_ONLY" as const
});

const initialStudios = [
  ["ST-001", "architecture"],
  ["ST-002", "android"],
  ["ST-003", "windows"],
  ["ST-004", "dsh"],
  ["ST-005", "codex-bridge"],
  ["ST-006", "governance"],
  ["ST-007", "security"],
  ["ST-008", "testing"],
  ["ST-009", "build"],
  ["ST-010", "documentation"]
] as const;

export function createInitialQueue(): StudioTask[] {
  return initialStudios.map(([id, studio]) => ({
    id,
    studio,
    workspace: `studio/${studio}`,
    dependencies: [],
    state: "QUEUED",
    mode: "READ_ONLY",
    requiresReview: true
  }));
}

export function getReadyTasks(tasks: StudioTask[]): StudioTask[] {
  const passed = new Set(
    tasks.filter(task => task.state === "PASSED").map(task => task.id)
  );
  return tasks.filter(task =>
    task.state === "QUEUED" &&
    task.dependencies.every(id => passed.has(id))
  );
}

export function calculateConcurrency(
  capacity: CapacitySnapshot
): number {
  const values = [
    capacity.availableWorkers,
    capacity.resourceBudget,
    capacity.requestedWorkers,
    POLICY.maxConcurrency
  ];
  if (values.some(value => !Number.isInteger(value) || value < 0)) {
    throw new Error("Worker capacity values must be non-negative integers");
  }
  return Math.min(...values);
}

export function mayIntegrate(task: StudioTask, approvalGranted: boolean): boolean {
  return task.state === "REVIEW" &&
    (!POLICY.requireApprovalForExecution || approvalGranted);
}

export function validateTaskGraph(tasks: StudioTask[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const task of tasks) {
    if (ids.has(task.id)) errors.push(`Duplicate task ID: ${task.id}`);
    ids.add(task.id);
    if (!task.workspace.startsWith("studio/")) {
      errors.push(`Workspace outside studio boundary: ${task.id}`);
    }
    if (task.dependencies.includes(task.id)) {
      errors.push(`Self-dependency: ${task.id}`);
    }
  }

  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      if (!ids.has(dependency)) {
        errors.push(`Unknown dependency ${dependency} in ${task.id}`);
      }
    }
  }

  return errors;
}
