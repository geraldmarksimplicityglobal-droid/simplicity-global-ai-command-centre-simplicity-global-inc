import test from "node:test";
import assert from "node:assert/strict";
import { listModules, getModule } from "../src/core/module-registry.js";

test("registers the 24 planned domain system modules", () => {
  assert.equal(listModules().length, 24);
  assert.equal(getModule("SG-DOM-012").name, "Bing Webmaster");
});
test("unknown module identifiers return null", () => {
  assert.equal(getModule("SG-DOM-999"), null);
});
test("external mutation modules remain disabled", () => {
  for (const id of ["SG-DOM-004","SG-DOM-005","SG-DOM-006","SG-DOM-008","SG-DOM-009","SG-DOM-016"]) {
    assert.equal(getModule(id).state, "disabled");
  }
});
