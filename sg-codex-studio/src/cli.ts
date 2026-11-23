import { ObjectEngine } from "./object-engine.js";
import { isObjectType } from "./object-types.js";

function help(): void {
  process.stdout.write([
    "SG Codex CLI — safe local starter",
    "",
    "Usage:",
    "  sg-codex objects list",
    "  sg-codex objects validate <type> '<json-object>'",
    "  sg-codex help",
    "",
    "This starter validates schemas and lists registered object types.",
    "It does not execute shell commands, connect external services, or deploy."
  ].join("\n") + "\n");
}

export function runCli(args: string[]): number {
  const [area, command, type, rawJson] = args;
  if (!area || area === "help" || area === "--help" || area === "-h") {
    help();
    return 0;
  }

  if (area !== "objects") {
    process.stderr.write(`Unknown command group: ${area}\n`);
    help();
    return 2;
  }

  const engine = new ObjectEngine();
  if (command === "list") {
    for (const definition of engine.listTypes()) {
      process.stdout.write(`${definition.type}\t${definition.description}\n`);
    }
    return 0;
  }

  if (command === "validate") {
    if (!type || !rawJson) {
      process.stderr.write("Usage: sg-codex objects validate <type> '<json-object>'\n");
      return 2;
    }
    if (!isObjectType(type)) {
      process.stderr.write(`Unknown object type: ${type}\n`);
      return 2;
    }
    try {
      const data: unknown = JSON.parse(rawJson);
      const errors = engine.validate(type, data);
      if (errors.length) {
        process.stderr.write(errors.join("\n") + "\n");
        return 1;
      }
      process.stdout.write(`Valid ${type} object payload\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }

  process.stderr.write(`Unknown objects command: ${command ?? "(missing)"}\n`);
  help();
  return 2;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  process.exitCode = runCli(process.argv.slice(2));
}
