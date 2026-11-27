import test from "node:test";
import assert from "node:assert/strict";
import {
  createTreasuryInstruction,
  validateTreasuryInstruction,
  simulateTreasuryInstruction,
  assertLiveExecutionDisabled,
  evaluateDebitOrderWindow
} from "../src/treasury.mjs";

test("creates a sandbox-only draft without enabling live execution", () => {
  const item = createTreasuryInstruction({
    id: "demo-001", assetCode: "USDC", network: "ethereum",
    tokenDecimals: 6, amount: "12.340000", destinationRef: "beneficiary-demo",
    mode: "sandbox"
  });
  assert.equal(item.status, "draft");
  assert.equal(item.liveExecutionAllowed, false);
  assert.equal(item.fundsMoved, false);
});

test("rejects live mode at instruction creation", () => {
  assert.throws(() => createTreasuryInstruction({
    id: "live-001", assetCode: "USDC", network: "ethereum",
    tokenDecimals: 6, amount: "1", destinationRef: "beneficiary-demo",
    mode: "live"
  }), /live execution is disabled/);
});

test("validates token precision exactly using integer base units", () => {
  const draft = createTreasuryInstruction({
    id: "demo-002", assetCode: "USDC", network: "ethereum",
    tokenDecimals: 6, amount: "12.340001", destinationRef: "beneficiary-demo",
    mode: "sandbox"
  });
  const validated = validateTreasuryInstruction(draft);
  assert.equal(validated.status, "validated");
  assert.equal(validated.amountBaseUnits, "12340001");
});

test("rejects amounts with precision beyond token decimals", () => {
  const draft = createTreasuryInstruction({
    id: "demo-003", assetCode: "USDC", network: "ethereum",
    tokenDecimals: 6, amount: "1.0000001", destinationRef: "beneficiary-demo",
    mode: "sandbox"
  });
  assert.throws(() => validateTreasuryInstruction(draft), /decimal places/);
});

test("simulates only validated sandbox instructions and never moves funds", () => {
  const draft = createTreasuryInstruction({
    id: "demo-004", assetCode: "USDC", network: "ethereum",
    tokenDecimals: 6, amount: "2.5", destinationRef: "beneficiary-demo",
    mode: "sandbox"
  });
  const simulated = simulateTreasuryInstruction(validateTreasuryInstruction(draft));
  assert.equal(simulated.status, "simulated");
  assert.equal(simulated.fundsMoved, false);
  assert.equal(simulated.liveExecutionAllowed, false);
});

test("hard-blocks every live execution attempt", () => {
  assert.throws(() => assertLiveExecutionDisabled(), /live execution is disabled/);
});

test("debit-order watcher emits due alerts only and never initiates collection", () => {
  const result = evaluateDebitOrderWindow({
    id: "debit-demo-1", dueAt: "2026-11-27T09:00:00+02:00",
    status: "scheduled"
  }, "2026-11-27T10:00:00+02:00");
  assert.equal(result.alert, "overdue");
  assert.equal(result.collectionInitiated, false);
});
