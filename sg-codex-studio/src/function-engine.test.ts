import { test } from "node:test";
import assert from "node:assert/strict";
import { FUNCTION_TYPES, FunctionEngine, FunctionExecutionError } from "./function-engine.js";

const engine = new FunctionEngine();
test("registers all 30 Function micro-types exactly once", () => {
  assert.equal(FUNCTION_TYPES.length, 30);
  assert.equal(new Set(FUNCTION_TYPES).size, 30);
  assert.equal(engine.list().length, 30);
});
test("converts values only with explicit supported targets", () => {
  assert.equal(engine.execute("Convert", { value: "42", to: "number" }), 42);
  assert.equal(engine.execute("Convert", { value: "false", to: "boolean" }), false);
  assert.equal(engine.execute("Convert", { value: 7, to: "string" }), "7");
  assert.throws(() => engine.execute("Convert", { value: "maybe", to: "boolean" }), /boolean/i);
});
test("validates required object properties", () => {
  assert.deepEqual(engine.execute("Validate", { value: { name: "A" }, required: ["name", "id"] }), { valid: false, missing: ["id"] });
});
test("searches string and JSON values", () => {
  assert.deepEqual(engine.execute("Search", { value: { message: "Hello World" }, query: "world" }), { found: true, query: "world" });
});
test("filters and stably sorts object arrays", () => {
  const items = [{ name: "b", rank: 2 }, { name: "a", rank: 1 }, { name: "c", rank: 1 }];
  assert.deepEqual(engine.execute("Filter", { items, field: "rank", equals: 1 }), [items[1], items[2]]);
  assert.deepEqual(engine.execute("Sort", { items, field: "rank", direction: "asc" }), [items[1], items[2], items[0]]);
});
test("groups objects by a direct property", () => {
  assert.deepEqual(engine.execute("Group", { items: [{ team: "A", n: 1 }, { team: "B", n: 2 }, { team: "A", n: 3 }], field: "team" }), { A: [{ team: "A", n: 1 }, { team: "A", n: 3 }], B: [{ team: "B", n: 2 }] });
});
test("merges objects only with an explicit conflict policy", () => {
  assert.throws(() => engine.execute("Merge", { objects: [{ a: 1 }, { a: 2 }] }), /conflict/i);
  assert.deepEqual(engine.execute("Merge", { objects: [{ a: 1 }, { a: 2, b: 3 }], strategy: "last" }), { a: 2, b: 3 });
});
test("splits strings and clones JSON values", () => {
  assert.deepEqual(engine.execute("Split", { value: "a,b,c", separator: "," }), ["a", "b", "c"]);
  assert.deepEqual(engine.execute("Clone", { value: { nested: [1, 2] } }), { nested: [1, 2] });
});
test("rejects unknown and deferred functions without executing them", () => {
  assert.throws(() => engine.execute("NoSuchFunction", {}), (error: unknown) => error instanceof FunctionExecutionError && error.code === "UNKNOWN_FUNCTION");
  assert.throws(() => engine.execute("GenerateText", { prompt: "hello" }), (error: unknown) => error instanceof FunctionExecutionError && error.code === "FUNCTION_UNAVAILABLE");
  assert.throws(() => engine.execute("Delete", { id: "x" }), (error: unknown) => error instanceof FunctionExecutionError && error.code === "APPROVAL_REQUIRED");
});
test("rejects invalid shapes and unsafe sort/merge options", () => {
  assert.throws(() => engine.execute("Filter", { items: "not-array", field: "id", equals: 1 }), /items/i);
  assert.throws(() => engine.execute("Sort", { items: [{ x: {} }], field: "x" }), /scalar/i);
  assert.throws(() => engine.execute("Merge", { objects: [{ a: 1 }, { a: 2 }], strategy: "ignore" }), /strategy/i);
});
