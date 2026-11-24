import test from "node:test";
import assert from "node:assert/strict";
import { WorkflowService } from "../src/service.js";

function makeAdapter() {
  return {
    async listWorkflows() { return [{ id: "zap_1", name: "Invoice intake", status: "on" }]; },
    async getWorkflow(id) { return { id, name: "Invoice intake", status: "on" }; },
    async getRunHistory() { return [{ id: "run_1", status: "error", errorCode: "AUTH", errorSummary: "Token expired" }]; }
  };
}

test("inventory and inspection are read-only and normalized", async () => {
  const service = new WorkflowService({ adapter: makeAdapter() });
  const inventory = await service.inspectInventory("operator");
  assert.equal(inventory[0].id, "zap_1");
  const inspected = await service.inspectWorkflow("zap_1", "operator");
  assert.equal(inspected.runs[0].errorCode, "AUTH");
});

test("diagnostics recommend a copy, not mutation of source", async () => {
  const service = new WorkflowService({ adapter: makeAdapter() });
  const { runs } = await service.inspectWorkflow("zap_1", "operator");
  assert.match(service.diagnose(runs)[0].recommendedAction, /copy-only/);
});

test("execution is blocked by default", async () => {
  const service = new WorkflowService({
    adapter: makeAdapter(),
    executor: { createWorkflowCopy: async () => ({ copyId: "copy_1" }) }
  });
  const proposal = service.createProposal({
    workflowId: "zap_1", actorId: "author", summary: "Fix auth",
    changes: [{ step: "QuickBooks", action: "refresh connection" }]
  });
  service.approveProposal(proposal, "reviewer");
  service.authorizeExecution(proposal, "executor");
  await assert.rejects(() => service.executeCopyOnly(proposal), /disabled by policy/);
});

test("reviewer and executor must be distinct", () => {
  const service = new WorkflowService({ adapter: makeAdapter(), policy: { allowLiveWrites: true } });
  const proposal = service.createProposal({
    workflowId: "zap_1", actorId: "author", summary: "Fix auth", changes: [{ action: "refresh" }]
  });
  service.approveProposal(proposal, "reviewer");
  assert.throws(() => service.authorizeExecution(proposal, "reviewer"), /different actors/);
  service.authorizeExecution(proposal, "executor");
  assert.equal(proposal.state, "EXECUTION_AUTHORIZED");
});

test("copy creation and test require separate guarded stages", async () => {
  const executor = {
    async createWorkflowCopy() { return { copyId: "copy_1" }; },
    async testWorkflowCopy() { return { passed: true }; }
  };
  const service = new WorkflowService({ adapter: makeAdapter(), executor, policy: { allowLiveWrites: true } });
  const proposal = service.createProposal({
    workflowId: "zap_1", actorId: "author", summary: "Fix auth", changes: [{ action: "refresh" }]
  });
  service.approveProposal(proposal, "reviewer");
  service.authorizeExecution(proposal, "executor");
  await service.executeCopyOnly(proposal);
  const result = await service.testCopy(proposal);
  assert.equal(result.proposal.state, "COPY_TESTED");
});

test("audit trail records control decisions", async () => {
  const service = new WorkflowService({ adapter: makeAdapter() });
  await service.inspectInventory("operator");
  assert.equal(service.auditTrail[0].type, "WORKFLOW_INVENTORY_INSPECTED");
});

test("editing a proposal after review invalidates its approval", () => {
  const service = new WorkflowService({ adapter: makeAdapter() });
  const proposal = service.createProposal({
    workflowId: "zap_1", actorId: "author", summary: "Fix auth", changes: [{ action: "refresh" }]
  });
  service.approveProposal(proposal, "reviewer");
  proposal.changes.push({ action: "send email" });
  assert.throws(() => service.authorizeExecution(proposal, "executor"), /changed after review approval/);
});

test("editing a proposal after execution authorization blocks dispatch", async () => {
  let dispatched = false;
  const executor = { async createWorkflowCopy() { dispatched = true; return { copyId: "copy_1" }; } };
  const service = new WorkflowService({ adapter: makeAdapter(), executor, policy: { allowLiveWrites: true } });
  const proposal = service.createProposal({
    workflowId: "zap_1", actorId: "author", summary: "Fix auth", changes: [{ action: "refresh" }]
  });
  service.approveProposal(proposal, "reviewer");
  service.authorizeExecution(proposal, "executor");
  proposal.summary = "Changed after approval";
  await assert.rejects(() => service.executeCopyOnly(proposal), /changed after execution authorization/);
  assert.equal(dispatched, false);
});
