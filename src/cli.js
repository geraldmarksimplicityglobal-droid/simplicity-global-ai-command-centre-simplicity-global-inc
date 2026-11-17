import { createPlan } from "./scheduler.js";
import { studioTasks } from "./registry.js";

const plan = createPlan();
console.log("SG-CODEX X1000 STUDIO ORCHESTRATOR");
console.log("Mode: READ_ONLY");
console.log(`Workstreams defined: ${studioTasks.length}`);
console.log(`Initial planning concurrency: ${plan.concurrency}`);
console.log(`Workers launched: ${plan.workersLaunched}`);
console.log("Ready tasks:");
for (const task of plan.ready) {
  console.log(`- ${task.id} [${task.studio}] ${task.objective}`);
}
console.log("No workspace directories were created and no worker processes were started.");
