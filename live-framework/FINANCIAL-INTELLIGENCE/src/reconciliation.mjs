import { toMinorUnits } from "./money.mjs";

function dayDistance(a, b) {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
}

export function generateReconciliationCandidates(bankRows, ledgerRows, options = {}) {
  if (!Array.isArray(bankRows) || !Array.isArray(ledgerRows)) throw new TypeError("bankRows and ledgerRows must be arrays");
  const maxDayDifference = Number.isInteger(options.maxDayDifference) ? options.maxDayDifference : 3;
  if (maxDayDifference < 0 || maxDayDifference > 31) throw new RangeError("maxDayDifference must be between 0 and 31");
  const candidates = [];
  for (const bank of bankRows) {
    const amount = toMinorUnits(bank.amount, bank.currency);
    const matches = ledgerRows.filter(ledger => {
      if (ledger.currency !== bank.currency || toMinorUnits(ledger.amount, ledger.currency) !== amount) return false;
      const days = dayDistance(bank.date, ledger.date);
      return Number.isFinite(days) && days <= maxDayDifference;
    }).map(ledger => ({
      bankId: bank.id, ledgerId: ledger.id, currency: bank.currency,
      amountMinor: amount.toString(), dayDifference: dayDistance(bank.date, ledger.date),
      referenceMatch: Boolean(bank.reference && ledger.reference &&
        bank.reference.trim().toLowerCase() === ledger.reference.trim().toLowerCase()),
      requiresHumanConfirmation: true, status: "candidate"
    })).sort((a, b) => Number(b.referenceMatch) - Number(a.referenceMatch) || a.dayDifference - b.dayDifference);
    for (const match of matches) candidates.push(Object.freeze(match));
  }
  return Object.freeze(candidates);
}
