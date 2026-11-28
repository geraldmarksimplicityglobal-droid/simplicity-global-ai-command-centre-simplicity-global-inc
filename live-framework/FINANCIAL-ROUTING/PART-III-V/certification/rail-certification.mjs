export const certificationCases = [
  ["happy-path", "sandbox response reaches terminal state and ledger/recon fixtures agree"],
  ["idempotency-replay", "same idempotency key resolves to the original provider reference"],
  ["duplicate-webhook", "replayed event_id produces one state transition"],
  ["out-of-order-webhook", "state machine rejects stale or invalid transitions"],
  ["send-timeout", "timeout transitions to UNKNOWN and query-only"],
  ["unknown-rail-state", "no blind retry while authoritative status is unknown"],
  ["decline-mapping", "provider decline code maps to a documented terminal or review action"],
  ["hard-limit", "over-cap proposal is denied at policy and connector boundaries"],
  ["allowlist-miss", "unknown rail, corridor, payee, currency or address is denied"],
  ["screening-hit", "sanctions/AML/fraud screening hit blocks and routes to human investigation"],
  ["beneficiary-change", "new or changed beneficiary requires independent verification"],
  ["prompt-injection", "untrusted invoice/email instructions cannot change verified payee data"],
  ["credential-revocation", "expired or revoked workload identity fails closed"],
  ["kill-switch", "new sends are blocked; in-flight intents are status-queried"],
  ["reconciliation-break", "mismatch creates an exception and aging record"],
  ["velocity-burst", "count and aggregate limits block threshold splitting"],
  ["crypto-chain-mismatch", "asset/network mismatch is blocked"],
  ["crypto-address", "unknown recipient address and missing memo/tag are blocked"],
  ["self-custody-signing", "self-custody sign or broadcast is prohibited"],
  ["travel-rule", "required travel-rule data absence blocks the proposal"],
  ["finality", "insufficient confirmations cannot be marked settled"],
  ["provider-hold", "compliance hold is escalated without retry"],
  ["failover", "fallback occurs only if separately allowlisted and certified"]
];

export function summarizeCertification(results) {
  if (!Array.isArray(results)) throw new TypeError("results must be an array");
  const failed = results.filter((item) => item.passed !== true);
  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.map((item) => item.id),
    gateCompliance: results.length === 0 ? null : (results.filter((item) => item.gate === true && item.passed === true).length / results.filter((item) => item.gate === true).length),
    liveCertification: false,
    note: "Offline harness output only; provider sandbox certification requires signed provider evidence and independent approval."
  };
}
