import test from "node:test";
import assert from "node:assert/strict";
import {
  toMinorUnits, formatMinorUnits, validateJournalProposal,
  normaliseSourceEvent, findDuplicateSourceEvents,
  assertFinancialActionAllowed, defineFinancialProvider,
  assertProviderCapability, generateReconciliationCandidates
} from "../src/index.mjs";

test("money arithmetic uses exact minor units and currency exponents", () => {
  assert.equal(toMinorUnits("1700.00", "ZAR"), 170000n);
  assert.equal(formatMinorUnits(170000n, "ZAR"), "1700.00");
  assert.equal(toMinorUnits("125", "JPY"), 125n);
  assert.equal(toMinorUnits("1.234", "BHD"), 1234n);
  assert.throws(() => toMinorUnits("1.001", "ZAR"), /decimal places/);
});

test("journal proposals must balance per currency and cannot be posted", () => {
  const proposal = validateJournalProposal({
    proposalId: "proposal-1", sourceSystem: "xero", sourceReference: "INV-1",
    lines: [
      { accountCode: "610", currency: "ZAR", debit: "1700.00" },
      { accountCode: "200", currency: "ZAR", credit: "1700.00" }
    ]
  });
  assert.equal(proposal.status, "proposed");
  assert.equal(proposal.postingAllowed, false);
  assert.equal(proposal.totals.ZAR.debitMinor, "170000");
  assert.throws(() => validateJournalProposal({
    sourceSystem: "xero", sourceReference: "INV-2",
    lines: [
      { accountCode: "610", currency: "ZAR", debit: "1700.00" },
      { accountCode: "200", currency: "ZAR", credit: "1600.00" }
    ]
  }), /unbalanced/);
});

test("source events are normalised and duplicate source IDs are detected", () => {
  const a = normaliseSourceEvent({
    sourceSystem: "xero", sourceId: "abc-1", eventType: "invoice",
    currency: "ZAR", amount: "1700.00", occurredAt: "2026-11-21T00:00:00Z"
  });
  const b = normaliseSourceEvent({
    sourceSystem: "xero", sourceId: "abc-1", eventType: "invoice",
    currency: "ZAR", amount: "1700.00", occurredAt: "2026-11-21T00:00:00Z"
  });
  assert.deepEqual(findDuplicateSourceEvents([a, b]), ["xero:abc-1"]);
  assert.equal(a.status, "observed");
});

test("financial writes require scoped approval and separate execution authorisation", () => {
  const approval = {
    status: "approved", operation: "financial.journal.post", resourceId: "j-1",
    requesterId: "requester", reviewerId: "reviewer",
    expiresAt: new Date(Date.now() + 60000).toISOString()
  };
  const executionAuthorisation = {
    status: "authorised", operation: "financial.journal.post", resourceId: "j-1",
    authoriserId: "executor", expiresAt: new Date(Date.now() + 60000).toISOString()
  };
  assert.equal(assertFinancialActionAllowed({
    operation: "financial.journal.post", resourceId: "j-1",
    requesterId: "requester", approval, executionAuthorisation
  }), true);
  assert.throws(() => assertFinancialActionAllowed({
    operation: "financial.journal.post", resourceId: "j-1",
    requesterId: "requester", approval: null, executionAuthorisation
  }), /approval/);
  assert.throws(() => assertFinancialActionAllowed({
    operation: "financial.journal.post", resourceId: "j-1",
    requesterId: "requester", approval,
    executionAuthorisation: { ...executionAuthorisation, authoriserId: "reviewer" }
  }), /separate/);
});

test("provider is read-only by default and rejects undeclared writes", () => {
  const provider = defineFinancialProvider({ id: "xero-ledger", capabilities: ["invoices:read"] });
  assert.equal(provider.mode, "read_only");
  assert.equal(assertProviderCapability(provider, "invoices:read"), true);
  assert.throws(() => assertProviderCapability(provider, "invoices:write"), /not declared/);
  const writable = defineFinancialProvider({
    id: "bank-connector", mode: "scoped_write", writesEnabled: true, capabilities: ["payments:write"]
  });
  assert.throws(() => assertProviderCapability(writable, "payments:write"), /requires separate approval/);
  const approval = {
    status: "approved", operation: "financial.payment.execute", resourceId: "payment-1",
    requesterId: "requester", reviewerId: "reviewer",
    expiresAt: new Date(Date.now() + 60000).toISOString()
  };
  const executionAuthorisation = {
    status: "authorised", operation: "financial.payment.execute", resourceId: "payment-1",
    authoriserId: "executor", expiresAt: new Date(Date.now() + 60000).toISOString()
  };
  assert.equal(assertProviderCapability(writable, "payments:write", {
    operation: "financial.payment.execute", resourceId: "payment-1", requesterId: "requester",
    approval, executionAuthorisation
  }), true);
  assert.throws(() => assertProviderCapability(writable, "payments:write", {
    operation: "financial.payment.execute", resourceId: "another-payment", requesterId: "requester",
    approval, executionAuthorisation
  }), /approval/);
});

test("reconciliation returns candidate matches but never confirms them", () => {
  const candidates = generateReconciliationCandidates(
    [{ id: "bank-1", amount: "1700.00", currency: "ZAR", date: "2026-11-21", reference: "INV-1" }],
    [
      { id: "ledger-1", amount: "1700.00", currency: "ZAR", date: "2026-11-21", reference: "INV-1" },
      { id: "ledger-2", amount: "1700.00", currency: "ZAR", date: "2026-11-22", reference: "other" }
    ]
  );
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].referenceMatch, true);
  assert.equal(candidates[0].status, "candidate");
  assert.equal(candidates[0].requiresHumanConfirmation, true);
});
