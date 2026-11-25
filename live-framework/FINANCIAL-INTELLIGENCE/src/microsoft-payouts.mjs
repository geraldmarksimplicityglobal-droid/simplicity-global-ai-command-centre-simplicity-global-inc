import { createHash } from "node:crypto";
import { toMinorUnits, formatMinorUnits } from "./money.mjs";
import { normaliseSourceEvent, sourceEventKey } from "./source-events.mjs";
import { defineFinancialProvider, assertProviderCapability } from "./provider-contract.mjs";
import { generateReconciliationCandidates } from "./reconciliation.mjs";
import { validateJournalProposal } from "./journal.mjs";

const PROGRAM_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const microsoftPayoutProvider = defineFinancialProvider({
  id: "microsoft-partner-center",
  mode: "read_only",
  capabilities: [
    "earnings:read",
    "payouts:read",
    "reports:read",
    "settlement:match",
    "accounting:proposal"
  ],
  credentialRef: null
});

export function assertMicrosoftPayoutReadCapability(capability) {
  return assertProviderCapability(microsoftPayoutProvider, capability);
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(field + " is required");
  }
  return value.trim();
}

function isDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function requireProgram(value) {
  const program = requireText(value, "programType").toLowerCase();
  if (!PROGRAM_PATTERN.test(program)) throw new TypeError("programType must be a lowercase program slug");
  return program;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeStatus(rawStatus) {
  const raw = String(rawStatus ?? "").trim().toLowerCase();
  const known = {
    pending: "pending",
    processing: "processing",
    sent: "sent_by_microsoft",
    uncollected: "uncollected",
    returned: "returned",
    failed: "action_required",
    rejected: "action_required"
  };
  return known[raw] ?? "unknown";
}

function earningAmounts(input) {
  const currency = requireText(input.currency, "currency").toUpperCase();
  const gross = toMinorUnits(input.grossAmount, currency);
  const fees = toMinorUnits(input.feesAmount ?? "0", currency);
  const withholding = toMinorUnits(input.withholdingAmount ?? "0", currency);
  const adjustment = toMinorUnits(input.adjustmentAmount ?? "0", currency);
  const net = toMinorUnits(input.netPayableAmount, currency);

  if (fees < 0n || withholding < 0n) {
    throw Object.assign(new RangeError("fees and withholding must be non-negative"), { code: "NEGATIVE_FEE_OR_WITHHOLDING" });
  }
  if (gross + adjustment - fees - withholding !== net) {
    throw Object.assign(new RangeError("net payable does not equal gross plus adjustments less fees and withholding"), {
      code: "NET_TOTAL_MISMATCH"
    });
  }
  return {
    currency, gross, fees, withholding, adjustment, net,
    formatted: {
      gross: formatMinorUnits(gross, currency),
      fees: formatMinorUnits(fees, currency),
      withholding: formatMinorUnits(withholding, currency),
      adjustment: formatMinorUnits(adjustment, currency),
      netPayable: formatMinorUnits(net, currency)
    }
  };
}

export function normaliseMicrosoftEarning(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Microsoft earning row is required");
  }
  const reportId = requireText(input.reportId, "reportId");
  const programType = requireProgram(input.programType);
  const sellerRef = typeof input.sellerRef === "string" && input.sellerRef.trim()
    ? input.sellerRef.trim()
    : "unassigned";
  const earningDate = requireText(input.earningDate, "earningDate");
  if (!isDate(earningDate)) throw new TypeError("earningDate must be a valid YYYY-MM-DD date");

  const amounts = earningAmounts(input);
  const stableContent = {
    programType, sellerRef, earningDate, currency: amounts.currency,
    gross: amounts.formatted.gross, fees: amounts.formatted.fees,
    withholding: amounts.formatted.withholding, adjustment: amounts.formatted.adjustment,
    netPayable: amounts.formatted.netPayable
  };
  const sourceRecordId = typeof input.sourceRecordId === "string" && input.sourceRecordId.trim()
    ? input.sourceRecordId.trim()
    : "sha256-" + digest(stableContent);
  const sourceId = [programType, sellerRef, sourceRecordId].join(":");
  const evidenceRef = typeof input.evidenceRef === "string" && input.evidenceRef.trim()
    ? input.evidenceRef.trim()
    : null;

  const sourceEvent = normaliseSourceEvent({
    sourceSystem: "microsoft-partner-center",
    sourceId,
    eventType: "earning",
    currency: amounts.currency,
    amount: amounts.formatted.netPayable,
    occurredAt: earningDate + "T00:00:00.000Z",
    externalReference: reportId,
    evidenceRef
  });

  const canonical = {
    programType, sellerRef, sourceRecordId, earningDate,
    currency: amounts.currency, amounts: amounts.formatted,
    rawStatus: typeof input.paymentStatus === "string" ? input.paymentStatus : null
  };
  const contentHash = digest(canonical);
  return Object.freeze({
    kind: "microsoft_earning",
    provider: "microsoft-partner-center",
    reportId,
    programType,
    sellerRef,
    sourceRecordId,
    earningDate,
    currency: amounts.currency,
    amounts: Object.freeze(amounts.formatted),
    rawStatus: canonical.rawStatus,
    sourceEvent,
    idempotencyKey: sourceEventKey(sourceEvent),
    contentHash,
    evidenceRef,
    postingAllowed: false
  });
}

function validateReportWindow(report) {
  if (!isDate(report.periodStart) || !isDate(report.periodEnd) || report.periodStart > report.periodEnd) {
    throw new TypeError("report period must contain ordered YYYY-MM-DD dates");
  }
}

function ingestRows(report, rows, normalise, existingRecords, reportType) {
  const result = {
    reportId: report.reportId,
    reportHash: digest(report),
    accepted: [],
    duplicates: [],
    collisions: [],
    exceptions: []
  };
  if (!Array.isArray(existingRecords)) {
    result.exceptions.push({ code: "INVALID_EXISTING_RECORDS" });
    return result;
  }
  const known = new Map(existingRecords.map(record => [record.idempotencyKey, record]));

  rows.forEach((row, rowIndex) => {
    try {
      const record = normalise({
        ...row,
        reportId: report.reportId,
        programType: row.programType ?? report.programType,
        sellerRef: row.sellerRef ?? report.sellerRef
      });
      if (report.currency && record.currency !== String(report.currency).toUpperCase()) {
        result.exceptions.push({ code: "CURRENCY_MISMATCH", rowIndex, sourceRecordId: record.sourceRecordId ?? record.payoutId });
        return;
      }
      if (reportType === "earnings" &&
          (record.earningDate < report.periodStart || record.earningDate > report.periodEnd)) {
        result.exceptions.push({ code: "DATE_OUTSIDE_PERIOD", rowIndex, sourceRecordId: record.sourceRecordId });
        return;
      }

      const previous = known.get(record.idempotencyKey);
      if (previous) {
        if (previous.contentHash === record.contentHash) {
          result.duplicates.push({ idempotencyKey: record.idempotencyKey, rowIndex });
        } else {
          result.collisions.push({ code: "IDENTIFIER_COLLISION", idempotencyKey: record.idempotencyKey, rowIndex });
        }
        return;
      }
      known.set(record.idempotencyKey, record);
      result.accepted.push(record);
    } catch (error) {
      result.exceptions.push({
        code: error.code ?? (error.message.includes("amount") || error.message.includes("decimal") ? "INVALID_AMOUNT" : "INVALID_" + reportType.toUpperCase() + "_ROW"),
        rowIndex,
        detail: error.message
      });
    }
  });
  return result;
}

export function ingestMicrosoftEarningsReport(report, existingRecords = []) {
  if (!report || typeof report !== "object" || Array.isArray(report) ||
      typeof report.reportId !== "string" || !report.reportId.trim() ||
      !Array.isArray(report.rows) || report.rows.length === 0) {
    return {
      reportId: report?.reportId ?? null, reportHash: report ? digest(report) : null,
      accepted: [], duplicates: [], collisions: [], exceptions: [{ code: "INVALID_REPORT" }]
    };
  }
  try {
    requireProgram(report.programType);
    validateReportWindow(report);
  } catch (error) {
    return {
      reportId: report.reportId, reportHash: digest(report),
      accepted: [], duplicates: [], collisions: [],
      exceptions: [{ code: "INVALID_REPORT", detail: error.message }]
    };
  }
  return ingestRows(report, report.rows, normaliseMicrosoftEarning, existingRecords, "earnings");
}

export function normaliseMicrosoftPayout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Microsoft payout row is required");
  }
  const payoutId = requireText(input.payoutId, "payoutId");
  const reportId = requireText(input.reportId, "reportId");
  const programType = requireProgram(input.programType);
  const sellerRef = typeof input.sellerRef === "string" && input.sellerRef.trim()
    ? input.sellerRef.trim()
    : "unassigned";
  const currency = requireText(input.currency, "currency").toUpperCase();
  const amount = formatMinorUnits(toMinorUnits(input.amount, currency), currency);
  const rawStatus = requireText(input.rawStatus, "rawStatus");
  const observedAt = requireText(input.observedAt, "observedAt");
  if (!isTimestamp(observedAt)) throw new TypeError("observedAt must be a valid timestamp");
  const sentDate = input.sentDate == null || input.sentDate === "" ? null : String(input.sentDate);
  if (sentDate !== null && !isDate(sentDate)) throw new TypeError("sentDate must be a valid YYYY-MM-DD date");

  const reference = typeof input.reference === "string" && input.reference.trim()
    ? input.reference.trim()
    : payoutId;
  const evidenceRef = typeof input.evidenceRef === "string" && input.evidenceRef.trim()
    ? input.evidenceRef.trim()
    : null;
  const sourceEvent = normaliseSourceEvent({
    sourceSystem: "microsoft-partner-center",
    sourceId: [programType, sellerRef, payoutId].join(":"),
    eventType: "payout",
    currency,
    amount,
    occurredAt: observedAt,
    externalReference: reference,
    evidenceRef
  });
  const canonical = {
    payoutId, programType, sellerRef, currency, amount,
    rawStatus, observedAt, sentDate, reference
  };
  return Object.freeze({
    kind: "microsoft_payout",
    provider: "microsoft-partner-center",
    payoutId, reportId, programType, sellerRef, currency, amount,
    rawStatus,
    normalizedStatus: normalizeStatus(rawStatus),
    observedAt, sentDate, reference, evidenceRef,
    sourceEvent,
    idempotencyKey: sourceEventKey(sourceEvent),
    contentHash: digest(canonical),
    bankReceived: false,
    reconciled: false,
    postingAllowed: false
  });
}

export function ingestMicrosoftPayoutReport(report, existingRecords = []) {
  if (!report || typeof report !== "object" || Array.isArray(report) ||
      typeof report.reportId !== "string" || !report.reportId.trim() ||
      !Array.isArray(report.payouts) || report.payouts.length === 0) {
    return {
      reportId: report?.reportId ?? null, reportHash: report ? digest(report) : null,
      accepted: [], duplicates: [], collisions: [], exceptions: [{ code: "INVALID_REPORT" }]
    };
  }
  try {
    requireProgram(report.programType);
  } catch (error) {
    return {
      reportId: report.reportId, reportHash: digest(report),
      accepted: [], duplicates: [], collisions: [],
      exceptions: [{ code: "INVALID_REPORT", detail: error.message }]
    };
  }
  return ingestRows(report, report.payouts, normaliseMicrosoftPayout, existingRecords, "payouts");
}

export function generateMicrosoftPayoutSettlementCandidates(bankRows, payouts, options = {}) {
  if (!Array.isArray(payouts)) throw new TypeError("payouts must be an array");
  const sentPayouts = payouts
    .filter(payout => payout.normalizedStatus === "sent_by_microsoft" && payout.sentDate)
    .map(payout => ({
      id: payout.payoutId,
      amount: payout.amount,
      currency: payout.currency,
      date: payout.sentDate,
      reference: payout.reference
    }));
  return generateReconciliationCandidates(bankRows, sentPayouts, options);
}

export function buildMicrosoftEarningJournalProposal(earning, mapping) {
  if (!earning || earning.kind !== "microsoft_earning") {
    throw new TypeError("normalised Microsoft earning is required");
  }
  if (!mapping || mapping.status !== "approved" ||
      typeof mapping.approvalRef !== "string" || !mapping.approvalRef.trim() ||
      typeof mapping.reviewerId !== "string" || !mapping.reviewerId.trim()) {
    throw new Error("approved account mapping with reviewer evidence is required");
  }
  const accounts = mapping.accounts ?? {};
  const requiredAccounts = ["microsoftClearing", "revenue", "fees", "withholding", "adjustments"];
  for (const key of requiredAccounts) {
    if (typeof accounts[key] !== "string" || !accounts[key].trim()) {
      throw new TypeError("approved mapping is missing " + key + " account");
    }
  }
  if (new Set(requiredAccounts.map(key => accounts[key])).size !== requiredAccounts.length) {
    throw new Error("Microsoft payout account mappings must use distinct account codes");
  }

  const { currency, gross, fees, withholding, adjustment, net } = earning.amounts
    ? {
        currency: earning.currency,
        gross: toMinorUnits(earning.amounts.gross, earning.currency),
        fees: toMinorUnits(earning.amounts.fees, earning.currency),
        withholding: toMinorUnits(earning.amounts.withholding, earning.currency),
        adjustment: toMinorUnits(earning.amounts.adjustment, earning.currency),
        net: toMinorUnits(earning.amounts.netPayable, earning.currency)
      }
    : {};
  if (gross <= 0n || net <= 0n) {
    throw new Error("non-positive Microsoft earnings require manual accounting review");
  }

  const lines = [
    { accountCode: accounts.microsoftClearing, currency, debit: formatMinorUnits(net, currency), memo: "Microsoft net payable" },
    { accountCode: accounts.revenue, currency, credit: formatMinorUnits(gross, currency), memo: "Microsoft gross earnings" }
  ];
  if (fees > 0n) lines.push({ accountCode: accounts.fees, currency, debit: formatMinorUnits(fees, currency), memo: "Microsoft fees" });
  if (withholding > 0n) lines.push({ accountCode: accounts.withholding, currency, debit: formatMinorUnits(withholding, currency), memo: "Microsoft withholding" });
  if (adjustment > 0n) lines.push({ accountCode: accounts.adjustments, currency, credit: formatMinorUnits(adjustment, currency), memo: "Microsoft positive adjustment" });
  if (adjustment < 0n) lines.push({ accountCode: accounts.adjustments, currency, debit: formatMinorUnits(-adjustment, currency), memo: "Microsoft negative adjustment" });

  const proposal = validateJournalProposal({
    proposalId: "ms-earning-" + earning.contentHash.slice(0, 16),
    sourceSystem: "microsoft-partner-center",
    sourceReference: earning.idempotencyKey,
    lines
  });
  return Object.freeze({
    ...proposal,
    mappingApprovalRef: mapping.approvalRef,
    mappingReviewedBy: mapping.reviewerId,
    postingAllowed: false
  });
}
