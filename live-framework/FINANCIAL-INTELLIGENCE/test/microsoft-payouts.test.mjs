import test from "node:test";
import assert from "node:assert/strict";
import {
  microsoftPayoutProvider,
  assertMicrosoftPayoutReadCapability,
  normaliseMicrosoftEarning,
  ingestMicrosoftEarningsReport,
  normaliseMicrosoftPayout,
  ingestMicrosoftPayoutReport,
  generateMicrosoftPayoutSettlementCandidates,
  reviewMicrosoftPayoutSettlements,
  buildMicrosoftEarningJournalProposal
} from "../src/index.mjs";

const earningRow = () => ({
  sourceRecordId: "ROW-001",
  earningDate: "2026-11-10",
  currency: "USD",
  grossAmount: "100.00",
  feesAmount: "2.00",
  withholdingAmount: "5.00",
  adjustmentAmount: "1.00",
  netPayableAmount: "94.00",
  paymentStatus: "Pending"
});

const earningsReport = () => ({
  reportId: "MS-REPORT-001",
  programType: "marketplace",
  sellerRef: "seller-ref-001",
  currency: "USD",
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  rows: [earningRow()]
});

const payoutInput = (overrides = {}) => ({
  payoutId: "MS-PAYOUT-001",
  reportId: "MS-PAYMENTS-001",
  programType: "marketplace",
  sellerRef: "seller-ref-001",
  currency: "USD",
  amount: "94.00",
  rawStatus: "Sent",
  observedAt: "2026-11-17T10:00:00.000Z",
  sentDate: "2026-11-17",
  reference: "MS-REF-001",
  evidenceRef: "sha256:synthetic-evidence",
  ...overrides
});

test("Microsoft payout provider is read-only and exposes only declared capabilities", () => {
  assert.equal(microsoftPayoutProvider.mode, "read_only");
  assert.equal(microsoftPayoutProvider.writesEnabled, false);
  assert.equal(assertMicrosoftPayoutReadCapability("earnings:read"), true);
  assert.equal(assertMicrosoftPayoutReadCapability("payouts:read"), true);
  assert.throws(() => assertMicrosoftPayoutReadCapability("payouts:write"), /not declared/);
});

test("Microsoft earnings normalize exact amounts and preserve program/source provenance", () => {
  const normalized = normaliseMicrosoftEarning({
    ...earningRow(),
    reportId: "MS-REPORT-001",
    programType: "marketplace",
    sellerRef: "seller-ref-001",
    evidenceRef: "sha256:synthetic-evidence"
  });
  assert.equal(normalized.amounts.netPayable, "94.00");
  assert.equal(normalized.amounts.gross, "100.00");
  assert.equal(normalized.sourceEvent.sourceSystem, "microsoft-partner-center");
  assert.equal(normalized.sourceEvent.eventType, "earning");
  assert.equal(normalized.sourceEvent.status, "observed");
  assert.match(normalized.idempotencyKey, /^microsoft-partner-center:/);
  assert.equal(normalized.postingAllowed, false);
});

test("earnings report ingestion is idempotent and quarantines identifier collisions", () => {
  const first = ingestMicrosoftEarningsReport(earningsReport());
  assert.equal(first.accepted.length, 1);
  assert.equal(first.exceptions.length, 0);

  const nextReport = earningsReport();
  nextReport.reportId = "MS-REPORT-002";
  const repeated = ingestMicrosoftEarningsReport(nextReport, first.accepted);
  assert.equal(repeated.accepted.length, 0);
  assert.equal(repeated.duplicates.length, 1);

  const changed = earningsReport();
  changed.rows[0].grossAmount = "101.00";
  changed.rows[0].adjustmentAmount = "0.00";
  const collision = ingestMicrosoftEarningsReport(changed, first.accepted);
  assert.equal(collision.collisions.length, 1);
  assert.equal(collision.accepted.length, 0);
});

test("earnings report rejects arithmetic, date and currency mismatches", () => {
  const mismatch = earningsReport();
  mismatch.rows[0].netPayableAmount = "95.00";
  assert.equal(ingestMicrosoftEarningsReport(mismatch).exceptions[0].code, "NET_TOTAL_MISMATCH");

  const date = earningsReport();
  date.rows[0].earningDate = "2026-10-31";
  assert.equal(ingestMicrosoftEarningsReport(date).exceptions[0].code, "DATE_OUTSIDE_PERIOD");

  const currency = earningsReport();
  currency.rows[0].currency = "ZAR";
  assert.equal(ingestMicrosoftEarningsReport(currency).exceptions[0].code, "CURRENCY_MISMATCH");
});

test("same Microsoft row ID in different programs is a separate source event", () => {
  const marketplace = ingestMicrosoftEarningsReport(earningsReport());
  const storeReport = earningsReport();
  storeReport.programType = "store";
  const store = ingestMicrosoftEarningsReport(storeReport, marketplace.accepted);
  assert.equal(store.accepted.length, 1);
});

test("Microsoft payout status is preserved and never treated as bank receipt", () => {
  const payout = normaliseMicrosoftPayout(payoutInput());
  assert.equal(payout.rawStatus, "Sent");
  assert.equal(payout.normalizedStatus, "sent_by_microsoft");
  assert.equal(payout.bankReceived, false);
  assert.equal(payout.reconciled, false);

  const unknown = normaliseMicrosoftPayout(payoutInput({ rawStatus: "NewProviderStatus" }));
  assert.equal(unknown.rawStatus, "NewProviderStatus");
  assert.equal(unknown.normalizedStatus, "unknown");
});

test("payout report ingestion detects duplicates without posting or settling", () => {
  const report = {
    reportId: "MS-PAYMENTS-001",
    programType: "marketplace",
    sellerRef: "seller-ref-001",
    payouts: [payoutInput()]
  };
  const first = ingestMicrosoftPayoutReport(report);
  assert.equal(first.accepted.length, 1);
  assert.equal(first.accepted[0].reconciled, false);
  const nextReport = { ...report, reportId: "MS-PAYMENTS-002" };
  const second = ingestMicrosoftPayoutReport(nextReport, first.accepted);
  assert.equal(second.duplicates.length, 1);
});

test("settlement produces human-review candidates only for Microsoft-sent payouts", () => {
  const sent = normaliseMicrosoftPayout(payoutInput());
  const pending = normaliseMicrosoftPayout(payoutInput({
    payoutId: "MS-PAYOUT-002", rawStatus: "Pending", sentDate: null
  }));
  const bankRows = [{
    id: "BANK-001", amount: "94.00", currency: "USD",
    date: "2026-11-18", reference: "MS-REF-001"
  }];
  const candidates = generateMicrosoftPayoutSettlementCandidates(bankRows, [sent, pending]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].bankId, "BANK-001");
  assert.equal(candidates[0].ledgerId, "MS-PAYOUT-001");
  assert.equal(candidates[0].requiresHumanConfirmation, true);
  assert.equal(candidates[0].status, "candidate");
});


test("settlement review distinguishes ambiguous, FX, amount, date and unmatched exceptions", () => {
  const sent = normaliseMicrosoftPayout(payoutInput());
  const baseBank = {
    id: "BANK-REVIEW-001", amount: "94.00", currency: "USD",
    date: "2026-11-18", reference: "MS-REF-001"
  };
  assert.equal(reviewMicrosoftPayoutSettlements([baseBank], [sent])[0].status, "SUGGESTED_MATCH");

  const ambiguous = reviewMicrosoftPayoutSettlements(
    [baseBank, { ...baseBank, id: "BANK-REVIEW-002" }],
    [sent]
  );
  assert.equal(ambiguous[0].status, "AMBIGUOUS_MATCH");

  const fx = reviewMicrosoftPayoutSettlements(
    [{ ...baseBank, currency: "ZAR", amount: "1700.00" }],
    [sent]
  );
  assert.equal(fx[0].status, "FX_REVIEW");

  const amount = reviewMicrosoftPayoutSettlements(
    [{ ...baseBank, amount: "95.00" }],
    [sent]
  );
  assert.equal(amount[0].status, "AMOUNT_REVIEW");

  const date = reviewMicrosoftPayoutSettlements(
    [{ ...baseBank, date: "2026-12-15" }],
    [sent]
  );
  assert.equal(date[0].status, "DATE_REVIEW");

  assert.equal(reviewMicrosoftPayoutSettlements([], [sent])[0].status, "UNMATCHED");
  const pending = normaliseMicrosoftPayout(payoutInput({ rawStatus: "Pending", sentDate: null }));
  assert.equal(reviewMicrosoftPayoutSettlements([baseBank], [pending])[0].status, "NOT_SENT");
});

test("settlement review prevents one bank line being proposed for two payouts", () => {
  const first = normaliseMicrosoftPayout(payoutInput());
  const second = normaliseMicrosoftPayout(payoutInput({ payoutId: "MS-PAYOUT-002" }));
  const bank = [{
    id: "BANK-SHARED-001", amount: "94.00", currency: "USD",
    date: "2026-11-18", reference: "MS-REF-001"
  }];
  const result = reviewMicrosoftPayoutSettlements(bank, [first, second]);
  assert.equal(result[0].status, "CONFLICT");
  assert.equal(result[1].status, "CONFLICT");
  assert.equal(result[0].reconciled, false);
});

test("accounting output is a balanced draft only and requires approved account mapping", () => {
  const earning = ingestMicrosoftEarningsReport(earningsReport()).accepted[0];
  const mapping = {
    status: "approved",
    approvalRef: "FIN-MAPPING-001",
    reviewerId: "finance-reviewer",
    accounts: {
      microsoftClearing: "1200",
      revenue: "4000",
      fees: "6100",
      withholding: "1300",
      adjustments: "4900"
    }
  };
  const proposal = buildMicrosoftEarningJournalProposal(earning, mapping);
  assert.equal(proposal.status, "proposed");
  assert.equal(proposal.postingAllowed, false);
  assert.equal(proposal.totals.USD.debitMinor, proposal.totals.USD.creditMinor);
  assert.equal(proposal.mappingApprovalRef, "FIN-MAPPING-001");
  assert.throws(
    () => buildMicrosoftEarningJournalProposal(earning, { ...mapping, status: "pending" }),
    /approved account mapping/
  );
});
