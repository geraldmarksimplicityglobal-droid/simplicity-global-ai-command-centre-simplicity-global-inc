import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../../workflow-persistence.sql", import.meta.url);

test("workflow persistence migration creates tenant-scoped task and event tables", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS workflow_tasks/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS workflow_task_events/);
  assert.match(sql, /FOREIGN KEY \(organisation_id, task_id\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /workflow_tasks_org_scope/);
  assert.match(sql, /workflow_task_events_org_scope/);
});

test("workflow event history is append-only and task permissions fail closed", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /workflow_task_events_no_mutation/);
  assert.match(sql, /REVOKE UPDATE, DELETE, TRUNCATE ON workflow_task_events/);
  assert.match(sql, /workflow:read/);
  assert.match(sql, /workflow:request/);
  assert.match(sql, /workflow:approve/);
  assert.match(sql, /workflow:authorize/);
});

test("API embeds persistent workflow routes behind organisation scope", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  const routes = await readFile(new URL("../src/workflow-routes.js", import.meta.url), "utf8");
  assert.match(source, /registerWorkflowRoutes/);
  assert.match(routes, /workflow:read/);
  assert.match(routes, /workflow:request/);
  assert.match(routes, /workflow:approve/);
  assert.match(routes, /workflow:authorize/);
  assert.match(routes, /FOR UPDATE/);
  assert.match(routes, /workflow_task_events/);
});

test("runtime grants include durable workflow state without granting event mutation", async () => {
  const grants = await readFile(new URL("../../runtime-grants.template.sql", import.meta.url), "utf8");
  assert.match(grants, /workflow_tasks/);
  assert.match(grants, /workflow_task_events/);
  assert.match(grants, /REVOKE UPDATE, DELETE, TRUNCATE ON workflow_task_events/);
});
