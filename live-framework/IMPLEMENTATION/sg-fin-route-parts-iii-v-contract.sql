-- Contract checks for SG-FIN-ROUTE-001 Parts III-V persistence.
DO $$
DECLARE
  t text;
  enabled boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aif_agent_registry','aif_agent_messages','fin_payment_intents','fin_payment_outbox',
    'fin_ledger_evidence_events','fin_reconciliation_breaks','fin_model_inventory',
    'fin_policy_bundles','fin_policy_bundle_approvals','fin_control_evidence',
    'fin_dispute_cases','fin_provider_certifications'
  ] LOOP
    SELECT c.relrowsecurity INTO enabled
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=current_schema() AND c.relname=t;
    IF enabled IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'RLS not enabled for %',t;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='fin_payment_intents'::regclass
       AND pg_get_constraintdef(oid) LIKE '%execution_enabled = false%'
  ) THEN RAISE EXCEPTION 'payment intent execution block missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='fin_payment_outbox'::regclass
       AND pg_get_constraintdef(oid) LIKE '%dispatch_enabled = false%'
  ) THEN RAISE EXCEPTION 'outbox dispatch block missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='fin_ledger_evidence_events'::regclass
       AND pg_get_constraintdef(oid) LIKE '%posted_to_ledger = false%'
  ) THEN RAISE EXCEPTION 'ledger posting block missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='fin_policy_bundles'::regclass
       AND tgname='fin_policy_bundles_immutable'
       AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'policy bundle immutability trigger missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='aif_agent_messages'::regclass
       AND tgname='aif_agent_messages_immutable'
       AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'agent message immutability trigger missing'; END IF;
END $$;
