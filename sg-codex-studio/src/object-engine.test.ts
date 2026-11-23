import test from "node:test";
import assert from "node:assert/strict";
import { ObjectEngine } from "./object-engine.js";
import { OBJECT_TYPES } from "./object-types.js";

test("registers the 30 declared object micro-types", () => {
  const engine = new ObjectEngine();
  assert.equal(engine.listTypes().length, 30);
  assert.deepEqual(engine.listTypes().map(item => item.type), [...OBJECT_TYPES]);
});

test("creates, retrieves, lists and updates typed objects with versions", () => {
  let sequence = 0;
  const engine = new ObjectEngine({
    idFactory: () => `obj-${++sequence}`,
    now: () => new Date("2026-11-23T00:00:00.000Z")
  });
  const created = engine.create("Task", { title: "Build CLI", status: "queued" });
  assert.equal(created.version, 1);
  assert.equal(engine.get(created.id)?.data.title, "Build CLI");
  assert.equal(engine.list("Task").length, 1);
  const updated = engine.update(created.id, { status: "review" });
  assert.equal(updated.version, 2);
  assert.equal(updated.data.status, "review");
});

test("rejects unknown types, non-object data and prototype-sensitive keys", () => {
  const engine = new ObjectEngine();
  assert.match(engine.validate("Unknown", {}).join(" "), /Unknown object type/);
  assert.match(engine.validate("Task", []).join(" "), /plain JSON object/);
  assert.throws(() => engine.create("Task", JSON.parse('{"__proto__":{"polluted":true}}')));
});

test("requires explicit approval before delete and records audit events", () => {
  const engine = new ObjectEngine({ idFactory: () => "obj-1" });
  const record = engine.create("Note", { body: "Keep" });
  assert.throws(() => engine.delete(record.id, { allowDelete: false }), /explicit/);
  assert.equal(engine.delete(record.id, { allowDelete: true }), true);
  assert.deepEqual(engine.getAuditLog().map(event => event.action), ["CREATE", "DELETE"]);
});
