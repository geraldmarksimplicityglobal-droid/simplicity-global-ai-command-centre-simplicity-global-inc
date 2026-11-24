import { createHash, randomUUID } from "node:crypto";
import { assertReadOnlyAdapter, normalizeRun, normalizeWorkflow } from "./adapter-contract.js";
import { assertDistinctActors, assertNonEmpty, DEFAULT_POLICY } from "./policy.js";
import { ProposalState, auditEvent } from "./types.js";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function proposalDigest(proposal) {
  return createHash("sha256").update(stableStringify({ id: proposal.id, workflowId: proposal.workflowId, summary: proposal.summary, changes: proposal.changes })).digest("hex");
}
function assertProposalDigest(proposal, expected, stage) {
  if (!expected || proposalDigest(proposal) !== expected) throw new Error(`Proposal changed after ${stage}; approval chain is invalid`);
}

export class WorkflowService {
  #adapter; #executor; #policy; #audit = [];
  constructor({ adapter, executor = null, policy = {} }) {
    this.#adapter = assertReadOnlyAdapter(adapter); this.#executor = executor;
    this.#policy = Object.freeze({ ...DEFAULT_POLICY, ...policy });
  }
  get auditTrail() { return structuredClone(this.#audit); }
  #record(type, actorId, details) { this.#audit.push(auditEvent(type, actorId, details)); }
  async inspectInventory(actorId) {
    assertNonEmpty(actorId, "actorId");
    const workflows = (await this.#adapter.listWorkflows()).map(normalizeWorkflow);
    this.#record("WORKFLOW_INVENTORY_INSPECTED", actorId, { count: workflows.length }); return workflows;
  }
  async inspectWorkflow(workflowId, actorId) {
    assertNonEmpty(workflowId, "workflowId"); assertNonEmpty(actorId, "actorId");
    const [rawWorkflow, rawRuns] = await Promise.all([this.#adapter.getWorkflow(workflowId), this.#adapter.getRunHistory(workflowId)]);
    const workflow = normalizeWorkflow(rawWorkflow); const runs = rawRuns.map(normalizeRun);
    this.#record("WORKFLOW_INSPECTED", actorId, { workflowId, runCount: runs.length }); return Object.freeze({ workflow, runs });
  }
  diagnose(runs) {
    return runs.filter(run => run.status === "error" || run.status === "failed").map(run => ({
      runId: run.id, code: run.errorCode ?? "UNCLASSIFIED", summary: run.errorSummary ?? "Failure reported without a safe summary",
      recommendedAction: "Review the failed step and propose a copy-only correction; do not edit the source workflow.",
    }));
  }
  createProposal({ workflowId, actorId, summary, changes }) {
    assertNonEmpty(workflowId, "workflowId"); assertNonEmpty(actorId, "actorId"); assertNonEmpty(summary, "summary");
    if (!Array.isArray(changes) || changes.length === 0) throw new TypeError("At least one proposed change is required");
    const proposal = { id: "prop_" + randomUUID(), workflowId, summary, changes: structuredClone(changes), state: ProposalState.PROPOSED, reviewerId: null, executorId: null, copyId: null, createdBy: actorId, proposalDigest: null, approvedDigest: null, authorizedDigest: null };
    this.#record("CHANGE_PROPOSED", actorId, { proposalId: proposal.id, workflowId }); return proposal;
  }
  approveProposal(proposal, reviewerId) {
    assertNonEmpty(reviewerId, "reviewerId"); if (proposal.state !== ProposalState.PROPOSED) throw new Error("Only proposed changes can be reviewed");
    proposal.proposalDigest = proposalDigest(proposal); proposal.approvedDigest = proposal.proposalDigest; proposal.reviewerId = reviewerId; proposal.state = ProposalState.REVIEW_APPROVED;
    this.#record("REVIEW_APPROVED", reviewerId, { proposalId: proposal.id }); return proposal;
  }
  authorizeExecution(proposal, executorId) {
    assertNonEmpty(executorId, "executorId"); if (proposal.state !== ProposalState.REVIEW_APPROVED) throw new Error("Reviewer approval is required first");
    assertDistinctActors(proposal.reviewerId, executorId, this.#policy);
    proposal.executorId = executorId; proposal.state = ProposalState.EXECUTION_AUTHORIZED;
    this.#record("EXECUTION_AUTHORIZED", executorId, { proposalId: proposal.id }); return proposal;
  }
  async executeCopyOnly(proposal) {
    if (!this.#policy.allowLiveWrites) throw new Error("Live writes are disabled by policy");
    if (proposal.state !== ProposalState.EXECUTION_AUTHORIZED) throw new Error("Execution authorization is required");
    assertProposalDigest(proposal, proposal.authorizedDigest, "execution authorization");
    if (!this.#policy.requireCopyOnly) throw new Error("This release only supports copy-only execution");
    if (!this.#executor || typeof this.#executor.createWorkflowCopy !== "function") throw new Error("No approved copy-only executor is configured");
    const result = await this.#executor.createWorkflowCopy({ sourceWorkflowId: proposal.workflowId, proposal: structuredClone(proposal), requestedBy: proposal.executorId });
    if (!result?.copyId) throw new Error("Executor did not return a copyId");
    proposal.copyId = String(result.copyId); proposal.state = ProposalState.COPY_CREATED;
    this.#record("WORKFLOW_COPY_CREATED", proposal.executorId, { proposalId: proposal.id, copyId: proposal.copyId }); return proposal;
  }
  async testCopy(proposal) {
    if (proposal.state !== ProposalState.COPY_CREATED) throw new Error("A created copy is required before testing");
    if (!this.#executor || typeof this.#executor.testWorkflowCopy !== "function") throw new Error("No test-only executor is configured");
    const result = await this.#executor.testWorkflowCopy({ copyId: proposal.copyId });
    if (result?.passed !== true) { proposal.state = ProposalState.BLOCKED; this.#record("WORKFLOW_COPY_TEST_FAILED", proposal.executorId, { proposalId: proposal.id }); return { proposal, test: result ?? { passed: false } }; }
    proposal.state = ProposalState.COPY_TESTED; this.#record("WORKFLOW_COPY_TESTED", proposal.executorId, { proposalId: proposal.id }); return { proposal, test: result };
  }
}
