import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const read = relative => readFile(path.join(repoRoot, relative), "utf8");
test("GEN SYSTEM registry includes SG-SKILL-BUILD-001 at its canonical root", async () => {
  const registry = JSON.parse(await read("live-framework/ARCHITECTURE-LIBRARY/modules/registry.json"));
  const module = registry.modules.find(item => item.id === "SG-SKILL-BUILD-001");
  assert.ok(module);
  assert.equal(module.root, "live-framework/ANDROID-APP-ENGINE");
  assert.equal(module.status, "implemented-source");
  assert.equal(module.liveEnabled, false);
});
test("GEN SYSTEM folder map and framework index link the Android engine", async () => {
  const [folderMap, frameworkReadme] = await Promise.all([
    read("live-framework/ARCHITECTURE-LIBRARY/ROOTED-FOLDER-MAP.md"),
    read("live-framework/README.md")
  ]);
  assert.match(folderMap, /ANDROID-APP-ENGINE/);
  assert.match(folderMap, /SG-SKILL-BUILD-001/);
  assert.match(frameworkReadme, /ANDROID-APP-ENGINE/);
});
