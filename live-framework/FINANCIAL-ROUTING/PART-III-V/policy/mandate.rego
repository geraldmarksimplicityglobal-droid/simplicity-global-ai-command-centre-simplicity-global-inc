package payments.mandate

import rego.v1

default allow := false
default approval := "none"

deny contains "kill_switch_active" if input.context.kill_switch == true
deny contains "environment_not_authorized" if input.context.environment != "sandbox"
deny contains "sanctions_not_clear" if input.signals.sanctions != "clear"
deny contains "aml_not_clear" if input.signals.aml != "clear"
deny contains "screening_unavailable" if input.signals.screening_available != true
deny contains "fraud_score_invalid" if not is_number(input.signals.fraud_score)
deny contains "fraud_threshold_exceeded" if input.signals.fraud_score >= input.context.limits.fraud_max
deny contains "rail_not_allowlisted" if not input.intent.rail in input.context.allowlists.rails
deny contains "corridor_not_allowlisted" if not input.intent.corridor in input.context.allowlists.corridors
deny contains "payee_not_allowlisted" if not input.intent.payee_id in input.context.allowlists.payees
deny contains "new_or_changed_beneficiary" if input.intent.payee_new == true
deny contains "bank_details_changed" if input.intent.bank_detail_changed == true
deny contains "document_provenance_unverified" if input.signals.doc_provenance != "verified"
deny contains "hard_cap_exceeded" if input.intent.amount_minor > input.context.limits.hard_cap_minor
deny contains "currency_not_allowlisted" if not input.intent.currency in input.context.allowlists.currencies
deny contains "velocity_limit_exceeded" if input.signals.velocity_1h >= input.context.limits.velocity_1h_max
deny contains "requester_is_approver" if input.context.requester_id == input.context.approver_id
deny contains "approver_is_executor" if input.context.approver_id == input.context.executor_id
deny contains "proposer_is_executor" if input.context.proposer_id == input.context.executor_id
deny contains "missing_policy_version" if input.context.policy_version == ""
deny contains "missing_intent_hash" if input.intent_hash == ""

allow if {
  count(deny) == 0
  input.intent.amount_minor > 0
  input.context.environment == "sandbox"
}

approval := "treasury" if input.intent.amount_minor > input.context.limits.tier_t3_minor
approval := "dual" if {
  input.intent.amount_minor > input.context.limits.tier_t2_minor
  input.intent.amount_minor <= input.context.limits.tier_t3_minor
}
approval := "single" if {
  input.intent.amount_minor > input.context.limits.tier_t0_minor
  input.intent.amount_minor <= input.context.limits.tier_t2_minor
}
approval := "single" if input.intent.payee_new == true
