#!/usr/bin/env node
import { studioTasks } from "./registry.mjs";
import { createPlan } from "./scheduler.mjs";

const [command = "plan", ...args] = process.argv.slice(2);
if (command !== "plan") {
  console.error("Only the read-only 'plan' command is available. No worker execution backend is configured.");
  process.exitCode = 2;
} else {
  const concurrencyArg = args.find(arg => arg.startsWith("--concurrency="));
  const concurrency = concurrencyArg ? Number(concurrencyArg.split("=")[1]) : undefined;
  try {
    const plan = createPlan(studioTasks, concurrency === undefined ? {} : { requested: concurrency });
    process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
