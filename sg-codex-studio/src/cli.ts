import { ObjectEngine } from "./object-engine.js";
import { FileObjectStore } from "./object-store.js";
import { isObjectType, type ObjectType } from "./object-types.js";

interface CliOptions {
  args: string[];
  storePath: string;
  approveDelete: boolean;
}

function parseOptions(args: string[]): CliOptions {
  const remaining: string[] = [];
  let storePath = process.env.SG_CODEX_STORE ?? ".sg-codex/objects.json";
  let approveDelete = false;
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index]!;
    if (item === "--store") {
      const value = args[index + 1];
      if (!value) throw new Error("--store requires a file path");
      storePath = value;
      index += 1;
    } else if (item === "--approve-delete") {
      approveDelete = true;
    } else {
      remaining.push(item);
    }
  }
  return { args: remaining, storePath, approveDelete };
}

function help(): void {
  process.stdout.write([
    "SG Codex CLI — safe local starter",
    "",
    "Usage:",
    "  sg-codex objects types",
    "  sg-codex objects validate <type> '<json-object>'",
    "  sg-codex objects create <type> '<json-object>' [--store <path>]",
    "  sg-codex objects get <id> [--store <path>]",
    "  sg-codex objects list [type] [--store <path>]",
    "  sg-codex objects update <id> '<json-patch>' [--store <path>]",
    "  sg-codex objects delete <id> --approve-delete [--store <path>]",
    "  sg-codex objects audit [--store <path>]",
    "  sg-codex help",
    "",
    "Store defaults to .sg-codex/objects.json or SG_CODEX_STORE.",
    "Delete requires --approve-delete. The CLI never runs arbitrary shell commands.",
    "The JSON store is for single-process local development, not concurrent production use."
  ].join("\n") + "\n");
}

function parseJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function runCli(inputArgs: string[]): number {
  try {
    const options = parseOptions(inputArgs);
    const [area, command, first, second] = options.args;
    if (!area || area === "help" || area === "--help" || area === "-h") {
      help();
      return 0;
    }
    if (area !== "objects") {
      process.stderr.write(`Unknown command group: ${area}\n`);
      help();
      return 2;
    }

    if (command === "types") {
      const engine = new ObjectEngine();
      for (const definition of engine.listTypes()) {
        process.stdout.write(`${definition.type}\t${definition.description}\n`);
      }
      return 0;
    }

    if (command === "validate") {
      if (!first || !second) throw new Error("Usage: sg-codex objects validate <type> '<json-object>'");
      if (!isObjectType(first)) throw new Error(`Unknown object type: ${first}`);
      const errors = new ObjectEngine().validate(first, parseJson(second, "object"));
      if (errors.length) {
        process.stderr.write(errors.join("\n") + "\n");
        return 1;
      }
      process.stdout.write(`Valid ${first} object payload\n`);
      return 0;
    }

    const store = new FileObjectStore(options.storePath);
    if (command === "create") {
      if (!first || !second) throw new Error("Usage: sg-codex objects create <type> '<json-object>'");
      const record = store.create(first, parseJson(second, "object"));
      process.stdout.write(JSON.stringify(record, null, 2) + "\n");
      return 0;
    }
    if (command === "get") {
      if (!first) throw new Error("Usage: sg-codex objects get <id>");
      const record = store.get(first);
      if (!record) {
        process.stderr.write(`Object not found: ${first}\n`);
        return 1;
      }
      process.stdout.write(JSON.stringify(record, null, 2) + "\n");
      return 0;
    }
    if (command === "list") {
      if (first && !isObjectType(first)) throw new Error(`Unknown object type: ${first}`);
      process.stdout.write(JSON.stringify(store.list(first as ObjectType | undefined), null, 2) + "\n");
      return 0;
    }
    if (command === "update") {
      if (!first || !second) throw new Error("Usage: sg-codex objects update <id> '<json-patch>'");
      process.stdout.write(JSON.stringify(store.update(first, parseJson(second, "patch")), null, 2) + "\n");
      return 0;
    }
    if (command === "delete") {
      if (!first) throw new Error("Usage: sg-codex objects delete <id> --approve-delete");
      if (!options.approveDelete) throw new Error("Delete blocked: pass --approve-delete to confirm this operation");
      const deleted = store.delete(first, { allowDelete: true });
      process.stdout.write(deleted ? `Deleted ${first}\n` : `Object not found: ${first}\n`);
      return deleted ? 0 : 1;
    }
    if (command === "audit") {
      process.stdout.write(JSON.stringify(store.getAuditLog(), null, 2) + "\n");
      return 0;
    }

    process.stderr.write(`Unknown objects command: ${command ?? "(missing)"}\n`);
    help();
    return 2;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  process.exitCode = runCli(process.argv.slice(2));
}
