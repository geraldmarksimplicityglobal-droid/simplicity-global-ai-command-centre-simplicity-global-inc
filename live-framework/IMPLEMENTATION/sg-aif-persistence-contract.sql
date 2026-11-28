-- SG-AIF-001 persistence integration contract. Ephemeral CI database only.
\set ON_ERROR_STOP on

SELECT set_config('app.user_issuer','https://identity.example.test',false);
SELECT set_config('app.user_subject','org-user',false);

INSERT INTO role_permissions(role_id,permission_id)
SELECT '10000000-0000-4000-8000-000000000202',p.id
FROM permissions p
WHERE p.permission_key IN ('aif:read','financial-routing:read')
ON CONFLICT DO NOTHING;

INSERT INTO aif_workflows
 (id,organisation_id,title,objective,environment,autonomy_level,risk_level,simulation_only,status,current_stage,requester_user_id)
VALUES
 ('10000000-0000-4000-8000-000000000301','10000000-0000-4000-8000-000000000001','Org A workflow','Tenant isolation test','development','L2.1','low',false,'queued','queued','10000000-0000-4000-8000-000000000102'),
 ('20000000-0000-4000-8000-000000000302','20000000-0000-4000-8000-000000000002','Org B workflow','Tenant isolation test','development','L2.1','low',false,'queued','queued','10000000-0000-4000-8000-000000000102');

INSERT INTO aif_workflow_events
 (organisation_id,workflow_id,sequence,event_type,actor_user_id,payload,event_hash)
VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000301',1,'workflow.created','10000000-0000-4000-8000-000000000102','{"source":"contract-test"}',repeat('a',64)),
 ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000302',1,'workflow.created','10000000-0000-4000-8000-000000000102','{"source":"contract-test"}',repeat('b',64));

INSERT INTO financial_route_decisions
 (organisation_id,request_reference,amount_minor,currency,corridor,candidate_routes,hard_gates,decision_status,block_reasons,execution_allowed,created_by)
VALUES
 ('10000000-0000-4000-8000-000000000001','contract-org-a',10000,'ZAR','ZA-ZA','[]','{}','blocked','["mandate-not-configured"]',false,'10000000-0000-4000-8000-000000000102'),
 ('20000000-0000-4000-8000-000000000002','contract-org-b',20000,'ZAR','ZA-ZA','[]','{}','blocked','["mandate-not-configured"]',false,'10000000-0000-4000-8000-000000000102');

INSERT INTO aif_config_versions
 (id,organisation_id,config_key,version,configuration,created_by)
VALUES
 ('10000000-0000-4000-8000-000000000401','10000000-0000-4000-8000-000000000001','sg-aif-runtime',1,'{"runtimeMode":"read_only","maxProductionAutonomy":"L3.3","sandboxMaxAutonomy":"L5.4","memoryRetentionDays":30,"maxWorkflowConcurrency":2}', '10000000-0000-4000-8000-000000000102');

SET ROLE sg_live_framework_runtime;
SELECT set_config('app.user_issuer','https://identity.example.test',false);
SELECT set_config('app.user_subject','org-user',false);
SELECT set_config('app.organisation_id','10000000-0000-4000-8000-000000000001',false);

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM aif_workflows;
  IF n <> 1 THEN RAISE EXCEPTION 'AIF workflow tenant isolation expected one row, found %', n; END IF;
  SELECT count(*) INTO n FROM aif_workflow_events;
  IF n <> 1 THEN RAISE EXCEPTION 'AIF event tenant isolation expected one row, found %', n; END IF;
  SELECT count(*) INTO n FROM financial_route_decisions;
  IF n <> 1 THEN RAISE EXCEPTION 'Financial route tenant isolation expected one row, found %', n; END IF;

  INSERT INTO aif_workflow_events
   (organisation_id,workflow_id,sequence,event_type,actor_user_id,payload,previous_hash,event_hash)
  VALUES
   ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000301',2,'workflow.checkpoint_saved','10000000-0000-4000-8000-000000000102','{"checkpoint":true}',repeat('a',64),repeat('c',64));

  BEGIN
    INSERT INTO aif_workflow_events
     (organisation_id,workflow_id,sequence,event_type,actor_user_id,payload,previous_hash,event_hash)
    VALUES
     ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000301',4,'workflow.bad_sequence','10000000-0000-4000-8000-000000000102','{}',repeat('c',64),repeat('d',64));
    RAISE EXCEPTION 'Non-contiguous workflow event unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    INSERT INTO aif_workflow_events
     (organisation_id,workflow_id,sequence,event_type,actor_user_id,payload,previous_hash,event_hash)
    VALUES
     ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000301',3,'workflow.spoofed','10000000-0000-4000-8000-000000000101','{}',repeat('c',64),repeat('d',64));
    RAISE EXCEPTION 'Spoofed workflow actor unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    UPDATE aif_workflows SET status='approved'
     WHERE id='10000000-0000-4000-8000-000000000301';
    RAISE EXCEPTION 'Invalid workflow state transition unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    UPDATE aif_workflows SET status='simulated'
     WHERE id='10000000-0000-4000-8000-000000000301';
    RAISE EXCEPTION 'Unimplemented simulation status unexpectedly succeeded';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    INSERT INTO aif_config_approvals
     (organisation_id,config_version_id,approver_user_id,decision)
    VALUES
     ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000401','10000000-0000-4000-8000-000000000102','approved');
    RAISE EXCEPTION 'Self-approval unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    INSERT INTO aif_config_activations
     (organisation_id,config_version_id,activated_by)
    VALUES
     ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000401','10000000-0000-4000-8000-000000000102');
    RAISE EXCEPTION 'Activation without independent approval unexpectedly succeeded';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  INSERT INTO aif_workflows
   (id,organisation_id,title,objective,environment,autonomy_level,risk_level,requester_user_id)
  VALUES
   ('10000000-0000-4000-8000-000000000303','10000000-0000-4000-8000-000000000001','Runtime insert','Permission boundary','development','L2.1','low','10000000-0000-4000-8000-000000000102');

  INSERT INTO aif_workflow_events
   (organisation_id,workflow_id,sequence,event_type,actor_user_id,payload,previous_hash,event_hash)
  VALUES
   ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000303',1,'workflow.inspected','10000000-0000-4000-8000-000000000102','{}',NULL,repeat('e',64));

  UPDATE aif_workflows SET status='inspected',current_stage='inspected',state_version=2
  WHERE id='10000000-0000-4000-8000-000000000303';
  SELECT count(*) INTO n FROM aif_workflows
  WHERE id='10000000-0000-4000-8000-000000000303' AND status='inspected';
  IF n <> 1 THEN RAISE EXCEPTION 'AIF workflow state update failed'; END IF;

  BEGIN
    UPDATE aif_workflow_events SET event_type='tampered'
    WHERE workflow_id='10000000-0000-4000-8000-000000000301';
    RAISE EXCEPTION 'AIF workflow event update unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    INSERT INTO aif_workflows
     (organisation_id,title,objective,environment,autonomy_level,risk_level,requester_user_id)
    VALUES
     ('20000000-0000-4000-8000-000000000002','Cross-tenant insert','Must be denied','development','L2.1','low','10000000-0000-4000-8000-000000000102');
    RAISE EXCEPTION 'Cross-tenant AIF insert unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO financial_route_decisions
     (organisation_id,request_reference,amount_minor,currency,corridor,decision_status,execution_allowed,created_by)
    VALUES
     ('10000000-0000-4000-8000-000000000001','must-not-execute',100,'ZAR','ZA-ZA','blocked',true,'10000000-0000-4000-8000-000000000102');
    RAISE EXCEPTION 'Financial execution flag unexpectedly accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END $$;

RESET ROLE;
