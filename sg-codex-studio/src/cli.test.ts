import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { main } from "./cli.js";

async function runCase(run: (cwd: string, out: string[]) => Promise<void>) {
  const cwd = await mkdtemp(join(tmpdir(), "sg-codex-cli-"));
  const out: string[] = [];
  try { await run(cwd, out); } finally { await rm(cwd, { recursive: true, force: true }); }
}
const io = (out: string[]) => ({ out: (value: string) => out.push(value), err: (_value: string) => {} });

test("prints help and initializes a local workspace", async () => runCase(async (cwd, out) => {
  assert.equal(await main(["help"], cwd, io(out)), 0);
  assert.match(out.join(""), /object create/);
  out.length = 0;
  assert.equal(await main(["init"], cwd, io(out)), 0);
  assert.match(out.join(""), /Initialized/);
  out.length = 0;
  assert.equal(await main(["doctor"], cwd, io(out)), 0);
  assert.match(out.join(""), /Node.js/);
}));

test("lists all 30 object types in JSON mode", async () => runCase(async (cwd, out) => {
  assert.equal(await main(["object", "types", "--json"], cwd, io(out)), 0);
  assert.equal(JSON.parse(out.join("")).length, 30);
}));

test("creates, gets, lists and approval-gates deletion", async () => runCase(async (cwd, out) => {
  assert.equal(await main(["object", "create", "Text", '{"value":"hello"}', "--id", "hello-1", "--json"], cwd, io(out)), 0);
  assert.equal(JSON.parse(out.join("")).id, "hello-1");
  out.length = 0;
  assert.equal(await main(["object", "get", "hello-1", "--json"], cwd, io(out)), 0);
  assert.equal(JSON.parse(out.join("")).data.value, "hello");
  out.length = 0;
  assert.equal(await main(["object", "list", "Text", "--json"], cwd, io(out)), 0);
  assert.equal(JSON.parse(out.join("")).length, 1);
  assert.equal(await main(["object", "delete", "hello-1"], cwd, io(out)), 2);
  assert.equal(await main(["object", "get", "hello-1"], cwd, io(out)), 0);
  assert.equal(await main(["object", "delete", "hello-1", "--yes"], cwd, io(out)), 0);
  assert.equal(await main(["object", "get", "hello-1"], cwd, io(out)), 1);
}));

test("rejects malformed JSON, unknown commands and unknown flags", async () => runCase(async (cwd, out) => {
  assert.equal(await main(["object", "create", "Text", "{bad"], cwd, io(out)), 2);
  assert.equal(await main(["not-a-command"], cwd, io(out)), 2);
  assert.equal(await main(["object", "list", "--unknown"], cwd, io(out)), 2);
}));


test("runs the CLI when its installation path contains spaces", async () => runCase(async (cwd, out) => {
  const binDir = join(cwd, "installed package");
  await mkdir(binDir, { recursive: true });
  const distDir = dirname(fileURLToPath(import.meta.url));
  await copyFile(join(distDir, "cli.js"), join(binDir, "cli.js"));
  await copyFile(join(distDir, "object-engine.js"), join(binDir, "object-engine.js"));
  await copyFile(join(distDir, "function-engine.js"), join(binDir, "function-engine.js"));
  const result = spawnSync(process.execPath, [join(binDir, "cli.js"), "help"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /SG Codex CLI/);
}));

 
test("discovers and runs local Function Engine operations", async () => runCase(async (cwd, out) => {
  assert.equal(await main(["function", "types", "--json"], cwd, io(out)), 0);
  assert.equal(JSON.parse(out.join("")).length, 30);
  out.length = 0;
  assert.equal(await main(["function", "run", "Split", '{"value":"a,b","separator":","}', "--json"], cwd, io(out)), 0);
  assert.deepEqual(JSON.parse(out.join("")), ["a", "b"]);
  out.length = 0;
  assert.equal(await main(["function", "run", "GenerateText", '{"prompt":"hello"}'], cwd, io(out)), 1);
}));
