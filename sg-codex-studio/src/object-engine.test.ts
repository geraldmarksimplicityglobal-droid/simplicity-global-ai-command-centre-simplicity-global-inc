import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OBJECT_TYPES, JsonObjectStore, validateObjectData } from "./object-engine.js";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "sg-object-engine-"));
  try { await run(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test("registers exactly the 30 supported object micro-types", () => {
  assert.equal(OBJECT_TYPES.length, 30);
  assert.equal(new Set(OBJECT_TYPES).size, 30);
  assert.ok(OBJECT_TYPES.includes("Dashboard"));
});

test("creates, retrieves and lists persisted objects", async () => withTempDir(async dir => {
  const store = new JsonObjectStore(dir);
  const created = await store.create("Text", { value: "hello" }, "text-1");
  assert.equal(created.id, "text-1");
  assert.equal((await store.get("text-1"))?.data.value, "hello");
  assert.deepEqual((await store.list("Text")).map(item => item.id), ["text-1"]);
  assert.equal((await store.list("Number")).length, 0);
}));

test("rejects unsupported object types and duplicate IDs", async () => withTempDir(async dir => {
  const store = new JsonObjectStore(dir);
  await assert.rejects(() => store.create("Unknown" as never, {}), /Unsupported object type/);
  await store.create("Text", { value: "one" }, "same-id");
  await assert.rejects(() => store.create("Text", { value: "two" }, "same-id"), /already exists/);
}));

test("validates JSON data and enforces the one MiB object limit", () => {
  assert.throws(() => validateObjectData({ value: undefined }), /JSON-compatible/);
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => validateObjectData(cyclic), /cyclic/i);
  assert.throws(() => validateObjectData({ value: "x".repeat(1024 * 1024) }), /1 MiB/);
});

test("rejects traversal-like object IDs", async () => withTempDir(async dir => {
  const store = new JsonObjectStore(dir);
  await assert.rejects(() => store.create("Text", {}, "../outside"), /Invalid object ID/);
}));

test("deletes only the requested object and reports missing IDs", async () => withTempDir(async dir => {
  const store = new JsonObjectStore(dir);
  await store.create("Text", { value: "keep" }, "keep");
  await store.create("Text", { value: "remove" }, "remove");
  assert.equal(await store.delete("remove"), true);
  assert.equal(await store.delete("missing"), false);
  assert.equal((await store.get("keep"))?.data.value, "keep");
}));

test("does not overwrite corrupt persisted JSON", async () => withTempDir(async dir => {
  const dataDir = join(dir, ".sg-codex");
  await mkdir(dataDir, { recursive: true });
  const file = join(dataDir, "objects.json");
  await writeFile(file, "{broken", "utf8");
  const store = new JsonObjectStore(dir);
  await assert.rejects(() => store.list(), /corrupt|invalid JSON/i);
  assert.equal(await readFile(file, "utf8"), "{broken");
}));

test("refuses a symlinked store directory", async () => withTempDir(async dir => {
  const outside = join(dir, "outside");
  await mkdir(outside);
  await symlink(outside, join(dir, ".sg-codex"), "dir");
  const store = new JsonObjectStore(dir);
  await assert.rejects(() => store.create("Text", { value: "x" }), /symlink/i);
}));

test("serializes concurrent creates without dropping records", async () => withTempDir(async dir => {
  const store = new JsonObjectStore(dir);
  await Promise.all(Array.from({ length: 12 }, (_, index) => store.create("Number", { value: index }, `n-${index}`)));
  assert.equal((await store.list()).length, 12);
}));

test("refuses a symlinked object store file", async () => withTempDir(async dir => {
  const dataDir = join(dir, ".sg-codex");
  const outside = join(dir, "outside.json");
  await mkdir(dataDir);
  await writeFile(outside, JSON.stringify({ version: 1, objects: [] }), "utf8");
  await symlink(outside, join(dataDir, "objects.json"), "file");
  const store = new JsonObjectStore(dir);
  await assert.rejects(() => store.list(), /symlink/i);
}));
