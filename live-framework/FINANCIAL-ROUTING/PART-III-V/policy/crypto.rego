package payments.crypto

import rego.v1

default allow := false

deny contains "kill_switch_active" if {
  input.context.kill_switch == true
}
deny contains "chain_not_allowlisted" if {
  not input.chain in input.context.allowlists.chains
}
deny contains "asset_chain_mismatch" if {
  not input.chain in input.context.allowlists.asset_chain[input.asset]
}
deny contains "address_not_allowlisted" if {
  not input.recipient_id in input.context.allowlists.address_ids
}
deny contains "memo_tag_required" if {
  input.context.allowlists.memo_required[input.asset][input.chain] == true
  input.memo == ""
}
deny contains "chain_analytics_not_clear" if {
  input.signals.chain_analytics != "clear"
}
deny contains "travel_rule_missing" if {
  input.context.travel_rule_required == true
  input.travel_rule.present != true
}
deny contains "self_custody_signing_prohibited" if {
  input.wallet_type == "self_custody"
  input.action in {"sign", "broadcast", "withdraw"}
}
deny contains "withdrawal_scope_not_separately_authorized" if {
  input.action == "withdraw"
  input.context.withdrawal_identity_authorized != true
}
deny contains "new_address_cooling_period" if {
  input.recipient_new == true
  input.context.cooling_period_elapsed != true
}
deny contains "confirmations_insufficient" if {
  input.action == "mark_settled"
  input.confirmations < input.context.limits.min_confirmations[input.chain]
}
deny contains "crypto_hard_cap_exceeded" if {
  input.amount_minor > input.context.limits.asset_caps_minor[input.asset]
}
deny contains "environment_not_sandbox" if {
  input.context.environment != "sandbox"
}

allow if {
  count(deny) == 0
  input.amount_minor > 0
}
