-- SG Self-Processing Part VI database safety contract.
DO $$
DECLARE t text;
DECLARE rls boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aif_loop_runs','aif_loop_leases','aif_loop_events',
    'aif_memory_proposals','aif_adaptation_events','aif_loop_incidents'
  ] LOOP
    SELECT c.relrowsecurity INTO rls
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=current_schema() AND c.relname=t;
    IF rls IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'RLS not enabled for %',t;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='aif_loop_runs'::regclass
       AND pg_get_constraintdef(oid) LIKE '%executor_enabled = false%'
  ) THEN RAISE EXCEPTION 'loop executor hard block missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='aif_loop_events'::regclass
       AND tgname='aif_loop_events_immutable' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'append-only loop forensics trigger missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='aif_memory_proposals'::regclass
       AND tgname='aif_memory_proposals_review_guard' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'independent memory review guard missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid='aif_adaptation_events'::regclass
       AND tgname='aif_adaptation_events_review_guard' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'adaptation review guard missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname=current_schema() AND indexname='idx_aif_loop_active_lease'
  ) THEN RAISE EXCEPTION 'single active lease index missing'; END IF;
END $$;
