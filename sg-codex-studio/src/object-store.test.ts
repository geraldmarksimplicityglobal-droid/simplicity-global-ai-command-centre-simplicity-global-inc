import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileObjectStore } from "./object-store.js";

test("persists typed objects across store instances and versions updates", () => {
  const directory = mkdtempSync(join(tmpdir(), "sg-codex-store-"));
  const file = join(directory, "objects.json");
  try {
    let id = 0;
    const options = {
      idFactory: () => `persisted-${++id}`,
      now: () => new Date("2026-11-23T00:00:00.000Z")
    };
    const first = new FileObjectStore(file, options);
    const created = first.create("Task", { title: "Persistent CLI" });
    const second = new FileObjectStore(file, options);
    assert.equal(second.get(created.id)?.data.title, "Persistent CLI");
    const updated = second.update(created.id, { status: "review" });
    assert.equal(updated.version, 2);
    const third = new FileObjectStore(file, options);
    assert.equal(third.get(created.id)?.data.status, "review");
    assert.deepEqual(third.getAuditLog().map(event => event.action), ["CREATE", "UPDATE"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("requires explicit delete approval and persists audit history", () => {
  const directory = mkdtempSync(join(tmpdir(), "sg-codex-store-"));
  const file = join(directory, "objects.json");
  try {
    const store = new FileObjectStore(file, { idFactory: () => "delete-me" });
    const record = store.create("Note", { body: "Preserve unless approved" });
    assert.throws(() => store.delete(record.id, { allowDelete: false }), /explicit/);
    assert.equal(store.delete(record.id, { allowDelete: true }), true);
    const reopened = new FileObjectStore(file);
    assert.equal(reopened.get(record.id), undefined);
    assert.deepEqual(reopened.getAuditLog().map(event => event.action), ["CREATE", "DELETE"]);
    const saved = JSON.parse(readFileSync(file, "utf8")) as { schemaVersion: number };
    assert.equal(saved.schemaVersion, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects corrupt or unsupported object store files", () => {
  const directory = mkdtempSync(join(tmpdir(), "sg-codex-store-"));
  const file = join(directory, "objects.json");
  try {
    writeFileSync(file, JSON.stringify({ schemaVersion: 99, records: [], auditEvents: [] }));
    assert.throws(() => new FileObjectStore(file), /unsupported or invalid schema/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
