#!/usr/bin/env node
import { mkdir, lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { JsonObjectStore, OBJECT_TYPES, isObjectType } from "./object-engine.js";

export interface CliIO { out(message: string): void; err(message: string): void; }
class UsageError extends Error {}
const HELP = [
  "SG Codex CLI",
  "",
  "Usage:",
  "  sg-codex help",
  "  sg-codex init [--json]",
  "  sg-codex doctor [--json]",
  "  sg-codex object types [--json]",
  "  sg-codex object create <type> <json> [--id ID] [--json]",
  "  sg-codex object get <id> [--json]",
  "  sg-codex object list [type] [--json]",
  "  sg-codex object delete <id> --yes [--json]",
  "",
  "Data is stored in .sg-codex/objects.json in the current project.",
  "Delete requires --yes. No network or shell commands are run."
].join("\n") + "\n";

function emit(io: CliIO, value: unknown, json: boolean): void {
  io.out((json ? JSON.stringify(value, null, 2) : String(value)) + "\n");
}
function parseData(raw: string): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new UsageError("Invalid JSON payload"); }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new UsageError("Object data must be a JSON object");
  return value as Record<string, unknown>;
}
function parseCreateArgs(args: string[]): { positional: string[]; id?: string } {
  const positional: string[] = [];
  let id: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--id") {
      if (id !== undefined || !args[i + 1] || args[i + 1]!.startsWith("--")) throw new UsageError("--id requires one ID value");
      id = args[++i]!;
    } else if (arg.startsWith("--")) throw new UsageError("Unknown option: " + arg);
    else positional.push(arg);
  }
  return { positional, id };
}

export async function main(argv: string[], cwd = process.cwd(), io: CliIO = {
  out: message => process.stdout.write(message),
  err: message => process.stderr.write(message)
}): Promise<number> {
  const json = argv.includes("--json");
  const args = argv.filter(arg => arg !== "--json");
  try {
    const command = args[0] ?? "help";
    if (["help", "--help", "-h"].includes(command)) {
      if (args.length > 1) throw new UsageError("help accepts no extra arguments");
      io.out(HELP); return 0;
    }
    if (command === "init") {
      if (args.length !== 1) throw new UsageError("init accepts no extra arguments");
      const directory = join(resolve(cwd), ".sg-codex");
      try {
        const stat = await lstat(directory);
        if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Refusing unsafe .sg-codex path");
      } catch (error) {
        if ((error as { code?: string }).code !== "ENOENT") throw error;
        await mkdir(directory);
      }
      emit(io, json ? { initialized: true, dataDirectory: directory } : "Initialized SG Codex workspace at " + directory, json);
      return 0;
    }
    if (command === "doctor") {
      if (args.length !== 1) throw new UsageError("doctor accepts no extra arguments");
      const node = process.versions.node;
      const healthy = Number(node.split(".")[0]) >= 20;
      const result = { healthy, node, minimumNode: "20", registeredObjectTypes: OBJECT_TYPES.length };
      emit(io, json ? result : "Node.js " + node + ": " + (healthy ? "OK" : "upgrade required") + "; " + OBJECT_TYPES.length + " object types registered", json);
      return healthy ? 0 : 1;
    }
    if (command !== "object") throw new UsageError("Unknown command: " + command);
    const action = args[1];
    if (!action) throw new UsageError("object requires a subcommand");
    const store = new JsonObjectStore(cwd);
    if (action === "types") {
      if (args.length !== 2) throw new UsageError("object types accepts no extra arguments");
      emit(io, json ? OBJECT_TYPES : OBJECT_TYPES.join("\n"), json); return 0;
    }
    if (action === "create") {
      const parsed = parseCreateArgs(args.slice(2));
      if (parsed.positional.length !== 2) throw new UsageError("object create requires <type> and <json>");
      const type = parsed.positional[0]!;
      if (!isObjectType(type)) throw new UsageError("Unsupported object type: " + type);
      const created = await store.create(type, parseData(parsed.positional[1]!), parsed.id);
      emit(io, json ? created : "Created " + created.type + " " + created.id, json); return 0;
    }
    if (action === "get") {
      if (args.length !== 3) throw new UsageError("object get requires exactly one ID");
      const item = await store.get(args[2]!);
      if (!item) { emit(io, json ? { error: "Object not found" } : "Object not found: " + args[2], json); return 1; }
      emit(io, json ? item : item.type + " " + item.id + "\n" + JSON.stringify(item.data, null, 2), json); return 0;
    }
    if (action === "list") {
      if (args.length > 3) throw new UsageError("object list accepts at most one type");
      const type = args[2];
      if (type !== undefined && !isObjectType(type)) throw new UsageError("Unsupported object type: " + type);
      const items = await store.list(type);
      emit(io, json ? items : (items.map(item => item.type + "\t" + item.id).join("\n") || "No objects found"), json); return 0;
    }
    if (action === "delete") {
      if (args.length !== 3 && !(args.length === 4 && args[3] === "--yes")) throw new UsageError("object delete requires <id> and explicit --yes approval");
      if (args[3] !== "--yes") throw new UsageError("Deletion not performed. Re-run with --yes to delete " + args[2] + ".");
      const deleted = await store.delete(args[2]!);
      emit(io, json ? { deleted, id: args[2] } : (deleted ? "Deleted " : "Object not found: ") + args[2], json);
      return deleted ? 0 : 1;
    }
    throw new UsageError("Unknown object subcommand: " + action);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof UsageError || error instanceof SyntaxError) {
      emit(io, json ? { error: message, usage: true } : "Usage error: " + message + "\nRun 'sg-codex help' for usage.", json);
      return 2;
    }
    emit(io, json ? { error: message } : "Error: " + message, json);
    return 1;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  void main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
