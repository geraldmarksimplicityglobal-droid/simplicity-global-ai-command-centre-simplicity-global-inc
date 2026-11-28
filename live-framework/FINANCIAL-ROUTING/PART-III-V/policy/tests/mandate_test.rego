package payments.mandate_test

import rego.v1
import data.payments.mandate

base := {
  "context": {
    "environment": "sandbox",
    "kill_switch": false,
    "policy_version": "test-1",
    "requester_id": "u1",
    "approver_id": "u2",
    "executor_id": "u3",
    "proposer_id": "u1",
    "limits": {"hard_cap_minor": 100000, "tier_t0_minor": 1000, "tier_t2_minor": 10000, "tier_t3_minor": 50000, "fraud_max": 0.2, "velocity_1h_max": 10},
    "allowlists": {"rails": ["INTERNAL_SANDBOX"], "corridors": ["ZA->ZA"], "payees": ["v1"], "currencies": ["ZAR"]}
  },
  "intent": {"amount_minor": 500, "currency": "ZAR", "rail": "INTERNAL_SANDBOX", "corridor": "ZA->ZA", "payee_id": "v1", "payee_new": false, "bank_detail_changed": false},
  "signals": {"sanctions": "clear", "aml": "clear", "screening_available": true, "fraud_score": 0.01, "velocity_1h": 1, "doc_provenance": "verified"},
  "intent_hash": "sha256:test"
}

test_valid_sandbox_proposal_allows if {
  mandate.allow with input as base
}

test_kill_switch_denies if {
  mandate.deny[_] == "kill_switch_active" with input as object.union(base, {"context": object.union(base.context, {"kill_switch": true})})
}

test_sanctions_hit_denies if {
  mandate.deny[_] == "sanctions_not_clear" with input as object.union(base, {"signals": object.union(base.signals, {"sanctions": "hit"})})
}

test_unknown_screening_denies if {
  mandate.deny[_] == "screening_unavailable" with input as object.union(base, {"signals": object.union(base.signals, {"screening_available": false})})
}

test_payee_change_denies if {
  mandate.deny[_] == "new_or_changed_beneficiary" with input as object.union(base, {"intent": object.union(base.intent, {"payee_new": true})})
}

test_production_denies_by_default if {
  mandate.deny[_] == "environment_not_authorized" with input as object.union(base, {"context": object.union(base.context, {"environment": "production"})})
}

test_missing_intent_hash_denies if {
  mandate.deny[_] == "missing_intent_hash" with input as object.union(base, {"intent_hash": ""})
}
