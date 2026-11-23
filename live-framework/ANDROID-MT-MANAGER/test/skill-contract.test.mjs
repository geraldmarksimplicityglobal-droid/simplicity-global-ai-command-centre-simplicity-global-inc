import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const skill = await readFile(new URL("../SKILL.md", import.meta.url), "utf8");

test("skill defines preflight, MT Manager, inspection, signing and integration", () => {
  for (const heading of [
    "## Capability boundaries", "## Android preflight", "## MT Manager workflow",
    "## APK inspection", "## Rebuild and signing workflow", "## Key custody",
    "## GEN SYSTEM integration", "## Verification checklist"
  ]) assert.ok(skill.includes(heading), "missing section: " + heading);
});

test("skill prohibits exposing signing secrets", () => {
  assert.match(skill, /Never place a keystore/i);
  assert.match(skill, /Never print password environment values/i);
  assert.match(skill, /redacted audit events/i);
});

test("skill requires live device evidence before activation claims", () => {
  assert.match(skill, /device must be connected and verified/i);
  assert.match(skill, /Source availability does not mean/i);
});
