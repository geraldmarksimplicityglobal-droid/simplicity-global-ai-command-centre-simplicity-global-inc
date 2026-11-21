-- SG-LIVE-002 PostgreSQL integration contract.
-- Executed only against an ephemeral CI database, never a production database.
\set ON_ERROR_STOP on

INSERT INTO organisations(id,name,status) VALUES
 ('10000000-0000-4000-8000-000000000001','Test Organisation A','active'),
 ('20000000-0000-4000-8000-000000000002','Test Organisation B','active');

INSERT INTO legal_entities(id,organisation_id,registered_name,jurisdiction,verification_status) VALUES
 ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','Entity A','ZA','verified'),
 ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','Entity B','ZA','verified'),
 ('20000000-0000-4000-8000-000000000022','20000000-0000-4000-8000-000000000002','Entity C','ZA','verified');

INSERT INTO app_users(id,email,display_name,status,identity_issuer,identity_subject) VALUES
 ('10000000-0000-4000-8000-000000000101','entity-user@example.test','Entity User','active','https://identity.example.test','entity-user'),
 ('10000000-0000-4000-8000-000000000102','org-user@example.test','Organisation User','active','https://identity.example.test','org-user');

INSERT INTO roles(id,organisation_id,role_key,description) VALUES
 ('10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000001','entity-reader','Entity scoped reader'),
 ('10000000-0000-4000-8000-000000000202','10000000-0000-4000-8000-000000000001','org-reader','Organisation reader');

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.id IN (
 '10000000-0000-4000-8000-000000000201',
 '10000000-0000-4000-8000-000000000202'
) AND p.permission_key='assets:read';

INSERT INTO user_memberships(organisation_id,user_id,role_id,legal_entity_id) VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000011'),
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000102','10000000-0000-4000-8000-000000000202',NULL);

INSERT INTO assets(organisation_id,legal_entity_id,name,category) VALUES
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000011','Entity A asset','application'),
 ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000012','Entity B asset','application'),
 ('10000000-0000-4000-8000-000000000001',NULL,'Organisation asset','repository'),
 ('20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000022','Other organisation asset','application');

SET ROLE sg_live_framework_runtime;
SELECT set_config('app.user_issuer','https://identity.example.test',false);
SELECT set_config('app.user_subject','entity-user',false);
SELECT set_config('app.organisation_id','10000000-0000-4000-8000-000000000001',false);
SELECT set_config('app.legal_entity_id','10000000-0000-4000-8000-000000000011',false);

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM app_users;
  IF n <> 1 THEN RAISE EXCEPTION 'identity RLS expected one user, found %', n; END IF;

  SELECT count(*) INTO n FROM user_memberships;
  IF n <> 1 THEN RAISE EXCEPTION 'membership RLS expected one membership, found %', n; END IF;

  SELECT count(*) INTO n FROM permissions WHERE permission_key='assets:read';
  IF n <> 1 THEN RAISE EXCEPTION 'runtime permission catalogue read failed'; END IF;

  SELECT count(*) INTO n FROM assets;
  IF n <> 1 THEN RAISE EXCEPTION 'entity scope expected one asset, found %', n; END IF;

  PERFORM set_config('app.legal_entity_id','*',false);
  SELECT count(*) INTO n FROM assets;
  IF n <> 0 THEN RAISE EXCEPTION 'entity-only membership widened to organisation scope'; END IF;

  PERFORM set_config('app.organisation_id','20000000-0000-4000-8000-000000000002',false);
  PERFORM set_config('app.legal_entity_id','20000000-0000-4000-8000-000000000022',false);
  SELECT count(*) INTO n FROM assets;
  IF n <> 0 THEN RAISE EXCEPTION 'cross-organisation asset access was not denied'; END IF;
END $$;

-- Verify that an organisation-wide membership sees only its own organisation.
SELECT set_config('app.user_subject','org-user',false);
SELECT set_config('app.organisation_id','10000000-0000-4000-8000-000000000001',false);
SELECT set_config('app.legal_entity_id','*',false);
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM assets;
  IF n <> 3 THEN RAISE EXCEPTION 'organisation-wide scope expected three assets, found %', n; END IF;
  INSERT INTO audit_events(organisation_id,action,target_type,target_id,outcome)
  VALUES ('10000000-0000-4000-8000-000000000001','ci.test','test','audit-append-only','success');
  BEGIN
    UPDATE audit_events SET outcome='tampered' WHERE target_id='audit-append-only';
    RAISE EXCEPTION 'audit event update unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN raise_exception THEN
      IF SQLERRM <> 'audit_events are append-only' THEN RAISE; END IF;
  END;
END $$;

RESET ROLE;
DO $$
DECLARE bypass boolean;
BEGIN
  SELECT rolbypassrls INTO bypass FROM pg_roles WHERE rolname='sg_live_framework_runtime';
  IF bypass IS DISTINCT FROM false THEN RAISE EXCEPTION 'runtime role must have NOBYPASSRLS'; END IF;
END $$;
