import { toMinorUnits } from "./money.mjs";

export function validateJournalProposal(proposal) {
  if (!proposal || typeof proposal !== "object") throw new TypeError("journal proposal required");
  if (!Array.isArray(proposal.lines) || proposal.lines.length < 2) throw new TypeError("a journal requires at least two lines");
  if (typeof proposal.sourceSystem !== "string" || !proposal.sourceSystem.trim() ||
      typeof proposal.sourceReference !== "string" || !proposal.sourceReference.trim()) {
    throw new TypeError("source system and source reference are required");
  }
  const totals = new Map();
  const normalisedLines = proposal.lines.map((line, index) => {
    if (!line || typeof line.accountCode !== "string" || !line.accountCode.trim()) {
      throw new TypeError("line " + index + " requires an account code");
    }
    const hasDebit = line.debit !== undefined && line.debit !== null;
    const hasCredit = line.credit !== undefined && line.credit !== null;
    if (hasDebit === hasCredit) throw new TypeError("each line must have exactly one of debit or credit");
    const amount = toMinorUnits(hasDebit ? line.debit : line.credit, line.currency);
    if (amount <= 0n) throw new RangeError("journal line amounts must be greater than zero");
    const bucket = totals.get(line.currency) ?? { debit: 0n, credit: 0n };
    bucket[hasDebit ? "debit" : "credit"] += amount;
    totals.set(line.currency, bucket);
    return Object.freeze({
      accountCode: line.accountCode.trim(), currency: line.currency,
      debitMinor: hasDebit ? amount.toString() : "0",
      creditMinor: hasCredit ? amount.toString() : "0",
      memo: typeof line.memo === "string" ? line.memo.slice(0, 500) : ""
    });
  });
  for (const [currency, total] of totals) {
    if (total.debit !== total.credit) throw new Error("journal is unbalanced for " + currency);
  }
  return Object.freeze({
    proposalId: String(proposal.proposalId ?? ""),
    sourceSystem: proposal.sourceSystem.trim(),
    sourceReference: proposal.sourceReference.trim(),
    status: "proposed",
    lines: Object.freeze(normalisedLines),
    totals: Object.freeze(Object.fromEntries([...totals].map(([currency, total]) => [
      currency, Object.freeze({ debitMinor: total.debit.toString(), creditMinor: total.credit.toString() })
    ]))),
    postingAllowed: false
  });
}
