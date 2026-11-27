import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("VS Code devcontainer selects the isolated workspace service", async () => {
  const config = JSON.parse(await read("../devcontainer.json"));
  assert.equal(config.service, "workspace");
  assert.equal(config.workspaceFolder, "/workspaces/simplicity-global");
  assert.equal(config.remoteUser, "node");
  assert.ok(config.customizations.vscode.extensions.includes("ms-azuretools.vscode-docker"));
});

test("API image runs as non-root and exposes a liveness health check", async () => {
  const dockerfile = await read("../api.Dockerfile");
  assert.match(dockerfile, /^FROM node:22-/m);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /HOST=0\.0\.0\.0/);
});

test("Compose keeps the database private and binds API to loopback", async () => {
  const compose = await read("../docker-compose.yml");
  assert.match(compose, /127\.0\.0\.1:8080:8080/);
  assert.doesNotMatch(compose, /5432:5432/);
  assert.match(compose, /cap_drop:[\s\S]*?ALL/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /profiles: \["application"\]/);
});

test("sample environment uses clearly non-production placeholders", async () => {
  const env = await read("../.env.container.example");
  assert.match(env, /REPLACE_WITH_A_LONG_RANDOM_LOCAL_ONLY_PASSWORD/);
  assert.match(env, /example\.invalid/);
  assert.doesNotMatch(env, /sk-[A-Za-z0-9_-]{16,}/);
});
