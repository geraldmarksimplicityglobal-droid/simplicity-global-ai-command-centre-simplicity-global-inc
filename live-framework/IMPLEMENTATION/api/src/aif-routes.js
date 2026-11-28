import { randomUUID } from "node:crypto";
import { isUuid } from "./scope.js";
import {
  validateWorkflowInput, assertWorkflowTransition, validateMemoryRecord,
  validateAifConfiguration, assertAutonomyWithinCeiling, buildFinancialRouteDecision, hashWorkflowEvent
} from "./aif-runtime.mjs";

function boundedLimit(value, fallback = 100) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) ? Math.min(200, Math.max(1, parsed)) : fallback;
}
function eventDetails(value) {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("event details must be an object");
  const allowed = {};
  if (value.summary !== undefined) {
    if (typeof value.summary !== "string" || value.summary.length > 1000) throw new TypeError("summary must be at most 1000 characters");
    allowed.summary = value.summary;
  }
  if (value.evidenceReference !== undefined) {
    if (typeof value.evidenceReference !== "string" || value.evidenceReference.length > 500) throw new TypeError("evidenceReference must be at most 500 characters");
    allowed.evidenceReference = value.evidenceReference;
  }
  return allowed;
}
async function appendWorkflowEvent(client, { organisationId, workflowId, actorId, eventType, payload }) {
  const { rows: lastRows } = await client.query(
    "SELECT sequence,event_hash FROM aif_workflow_events WHERE organisation_id=$1 AND workflow_id=$2 ORDER BY sequence DESC LIMIT 1",
    [organisationId, workflowId]
  );
  const sequence = (lastRows[0]?.sequence ?? 0) + 1;
  const previousHash = lastRows[0]?.event_hash ?? "";
  const occurredAt = new Date().toISOString();
  const event = { workflowId, sequence, eventType, actorId, payload, occurredAt };
  const eventHash = hashWorkflowEvent(event, previousHash);
  await client.query(
    "INSERT INTO aif_workflow_events (organisation_id,workflow_id,sequence,event_type,actor_user_id,payload,previous_hash,event_hash,occurred_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)",
    [organisationId, workflowId, sequence, eventType, actorId, JSON.stringify(payload), previousHash || null, eventHash, occurredAt]
  );
  await client.query(
    "UPDATE aif_workflows SET last_event_hash=$3 WHERE organisation_id=$1 AND id=$2",
    [organisationId, workflowId, eventHash]
  );
  return { sequence, eventHash, occurredAt };
}

export async function registerAifRoutes(app, requireScope) {
  app.get("/api/aif/runtime", async (request, reply) => requireScope(request, reply, "aif:read", async (client, _user, _membership, scope) => {
    const { rows } = await client.query(
      "SELECT (SELECT count(*)::int FROM aif_workflows) AS workflows, (SELECT count(*)::int FROM aif_memory_records WHERE expires_at > now()) AS memories, (SELECT count(*)::int FROM aif_plugin_registry) AS plugins, (SELECT count(*)::int FROM financial_route_decisions) AS route_decisions"
    );
    const active = await client.query(
      "SELECT c.id,c.version,c.configuration,a.activated_at FROM aif_config_activations a JOIN aif_config_versions c ON c.organisation_id=a.organisation_id AND c.id=a.config_version_id WHERE a.organisation_id=$1 AND c.config_key='sg-aif-runtime' ORDER BY a.activated_at DESC LIMIT 1",
      [scope.organisationId]
    );
    const config = active.rows[0]?.configuration ?? {};
    return {
      systemId: "SG-AIF-001",
      financialRoutingId: "SG-FIN-ROUTE-001",
      persistence: "postgresql",
      runtimeMode: config.runtimeMode ?? "read_only",
      productionAutonomyMaximum: config.maxProductionAutonomy ?? "L3.3",
      sandboxAutonomyMaximum: (config.sandboxMaxAutonomy ?? "L5.4") + "-simulation-only",
      maxWorkflowConcurrency: config.maxWorkflowConcurrency ?? 2,
      memoryRetentionDays: config.memoryRetentionDays ?? 30,
      activeConfiguration: active.rows[0] ?? null,
      financialExecutionEnabled: false,
      providerWritesEnabled: false,
      productionDeploymentEnabled: false,
      counts: rows[0]
    };
  }));

  app.get("/api/aif/workflows", async (request, reply) => requireScope(request, reply, "aif:read", async client => {
    const { rows } = await client.query(
      "SELECT id,title,environment,autonomy_level,risk_level,simulation_only,status,current_stage,state_version,created_at,updated_at FROM aif_workflows ORDER BY created_at DESC LIMIT $1",
      [boundedLimit(request.query?.limit)]
    );
    return { data: rows };
  }));

  app.post("/api/aif/workflows", async (request, reply) => requireScope(request, reply, "aif:write", async (client, user, _membership, scope) => {
    let input;
    try { input = validateWorkflowInput(request.body, user.userId); }
    catch (error) { return reply.code(400).send({ error: "invalid_workflow", message: error.message }); }
    const active = await client.query(
      "SELECT c.configuration FROM aif_config_activations a JOIN aif_config_versions c ON c.organisation_id=a.organisation_id AND c.id=a.config_version_id WHERE a.organisation_id=$1 AND c.config_key='sg-aif-runtime' ORDER BY a.activated_at DESC LIMIT 1",
      [scope.organisationId]
    );
    const activeConfig = active.rows[0]?.configuration ?? {};
    const autonomyCeiling = input.environment === "sandbox"
      ? (activeConfig.sandboxMaxAutonomy ?? "L5.4")
      : (activeConfig.maxProductionAutonomy ?? "L3.3");
    try { assertAutonomyWithinCeiling(input.autonomyLevel, autonomyCeiling); }
    catch (error) { return reply.code(400).send({ error:"active_autonomy_ceiling_exceeded",message:error.message }); }
    if (activeConfig.runtimeMode === "simulation" &&
        (input.environment !== "sandbox" || input.simulationOnly !== true)) {
      return reply.code(400).send({ error:"simulation_mode_requires_sandbox_simulation_only" });
    }
    const activeCount = await client.query(
      "SELECT count(*)::int AS count FROM aif_workflows WHERE status IN ('queued','inspected','planned','awaiting_approval','approved')"
    );
    if (activeCount.rows[0].count >= (activeConfig.maxWorkflowConcurrency ?? 2)) {
      return reply.code(429).send({ error:"workflow_concurrency_limit_reached" });
    }
    const id = randomUUID();
    const { rows } = await client.query(
      `INSERT INTO aif_workflows
       (id,organisation_id,title,objective,environment,autonomy_level,risk_level,simulation_only,status,current_stage,requester_user_id,idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'queued','queued',$9,$10)
       ON CONFLICT DO NOTHING
       RETURNING id,title,environment,autonomy_level,risk_level,simulation_only,status,current_stage,state_version,created_at,updated_at`,
      [id,scope.organisationId,input.title,input.objective,input.environment,input.autonomyLevel,input.riskLevel,input.simulationOnly,user.userId,input.idempotencyKey]
    );
    if (!rows.length) {
      if (input.idempotencyKey) {
        const existing = await client.query(
          "SELECT id,title,environment,autonomy_level,risk_level,simulation_only,status,current_stage,state_version,created_at,updated_at FROM aif_workflows WHERE organisation_id=$1 AND idempotency_key=$2",
          [scope.organisationId,input.idempotencyKey]
        );
        if (existing.rows[0]) return { data: existing.rows[0], idempotentReplay: true };
      }
      return reply.code(409).send({ error: "workflow_conflict" });
    }
    const workflow = rows[0];
    await appendWorkflowEvent(client, {
      organisationId: scope.organisationId, workflowId: workflow.id, actorId: user.userId,
      eventType: "workflow.created",
      payload: { environment: input.environment, autonomyLevel: input.autonomyLevel, riskLevel: input.riskLevel, simulationOnly: input.simulationOnly }
    });
    await client.query(
      "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'aif.workflow.created','aif_workflow',$3,'success')",
      [scope.organisationId,user.userId,workflow.id]
    );
    reply.code(201);
    return { data: workflow };
  }));

  app.get("/api/aif/workflows/:id", async (request, reply) => requireScope(request, reply, "aif:read", async (client, _user, _membership, scope) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error: "invalid_workflow_id" });
    const workflow = await client.query(
      "SELECT id,title,objective,environment,autonomy_level,risk_level,simulation_only,status,current_stage,checkpoint,state_version,created_at,updated_at FROM aif_workflows WHERE organisation_id=$1 AND id=$2",
      [scope.organisationId,request.params.id]
    );
    if (!workflow.rows[0]) return reply.code(404).send({ error: "workflow_not_found" });
    const events = await client.query(
      "SELECT sequence,event_type,actor_user_id,payload,previous_hash,event_hash,occurred_at FROM aif_workflow_events WHERE organisation_id=$1 AND workflow_id=$2 ORDER BY sequence",
      [scope.organisationId,request.params.id]
    );
    return { data: workflow.rows[0], events: events.rows };
  }));

  app.post("/api/aif/workflows/:id/events", async (request, reply) => requireScope(request, reply, "aif:write", async (client, user, _membership, scope) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error: "invalid_workflow_id" });
    const body = request.body || {};
    if (typeof body.nextStatus !== "string" || !Number.isInteger(body.expectedVersion)) {
      return reply.code(400).send({ error: "next_status_and_expected_version_required" });
    }
    let payload;
    try { payload = eventDetails(body.details); }
    catch (error) { return reply.code(400).send({ error: "invalid_event_details", message: error.message }); }
    const found = await client.query(
      "SELECT id,status,requester_user_id,risk_level,environment,simulation_only,state_version FROM aif_workflows WHERE organisation_id=$1 AND id=$2 FOR UPDATE",
      [scope.organisationId,request.params.id]
    );
    const workflow = found.rows[0];
    if (!workflow) return reply.code(404).send({ error: "workflow_not_found" });
    if (workflow.state_version !== body.expectedVersion) return reply.code(409).send({ error: "workflow_version_conflict", currentVersion: workflow.state_version });
    try {
      assertWorkflowTransition(workflow.status,body.nextStatus,{
        requesterId:workflow.requester_user_id,actorId:user.userId,riskLevel:workflow.risk_level,
        environment:workflow.environment,simulationOnly:workflow.simulation_only
      });
    } catch (error) { return reply.code(409).send({ error: "workflow_transition_denied", message: error.message }); }
    const updated = await client.query(
      "UPDATE aif_workflows SET status=$3,current_stage=$3,state_version=state_version+1,updated_at=now(),closed_at=CASE WHEN $3 IN ('rejected','cancelled','simulated') THEN now() ELSE closed_at END WHERE organisation_id=$1 AND id=$2 RETURNING id,status,current_stage,state_version,updated_at",
      [scope.organisationId,request.params.id,body.nextStatus]
    );
    await appendWorkflowEvent(client,{
      organisationId:scope.organisationId,workflowId:request.params.id,actorId:user.userId,
      eventType:"workflow."+body.nextStatus,payload
    });
    await client.query(
      "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'aif.workflow.transition','aif_workflow',$3,'success')",
      [scope.organisationId,user.userId,request.params.id]
    );
    return { data: updated.rows[0] };
  }));

  app.post("/api/aif/workflows/:id/checkpoints", async (request, reply) => requireScope(request, reply, "aif:write", async (client, user, _membership, scope) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error: "invalid_workflow_id" });
    const body = request.body || {};
    if (!Number.isInteger(body.expectedVersion)) return reply.code(400).send({ error: "expected_version_required" });
    let checkpoint;
    try {
      checkpoint = validateMemoryRecord({ memoryType:"working",memoryKey:"workflow-checkpoint",value:body.checkpoint,classification:"internal",ttlDays:30 }).value;
    } catch (error) { return reply.code(400).send({ error:"invalid_checkpoint",message:error.message }); }
    const updated = await client.query(
      "UPDATE aif_workflows SET checkpoint=$4::jsonb,state_version=state_version+1,updated_at=now() WHERE organisation_id=$1 AND id=$2 AND state_version=$3 AND status NOT IN ('rejected','cancelled','simulated') RETURNING id,state_version,updated_at",
      [scope.organisationId,request.params.id,body.expectedVersion,JSON.stringify(checkpoint)]
    );
    if (!updated.rows[0]) {
      const exists = await client.query("SELECT state_version FROM aif_workflows WHERE organisation_id=$1 AND id=$2",[scope.organisationId,request.params.id]);
      if (!exists.rows[0]) return reply.code(404).send({ error:"workflow_not_found" });
      return reply.code(409).send({ error:"workflow_version_conflict",currentVersion:exists.rows[0].state_version });
    }
    await appendWorkflowEvent(client,{
      organisationId:scope.organisationId,workflowId:request.params.id,actorId:user.userId,
      eventType:"workflow.checkpoint_saved",payload:{ checkpointKeys:Object.keys(checkpoint) }
    });
    return { data: updated.rows[0] };
  }));

  app.get("/api/aif/memory", async (request, reply) => requireScope(request, reply, "aif:read", async client => {
    const { rows } = await client.query(
      "SELECT id,memory_type,memory_key,value,classification,source_reference,expires_at,created_at FROM aif_memory_records WHERE expires_at > now() ORDER BY created_at DESC LIMIT $1",
      [boundedLimit(request.query?.limit)]
    );
    return { data: rows };
  }));

  app.post("/api/aif/memory", async (request, reply) => requireScope(request, reply, "aif:write", async (client, user, _membership, scope) => {
    let memory;
    try { memory = validateMemoryRecord(request.body); }
    catch (error) { return reply.code(400).send({ error:"invalid_memory_record",message:error.message }); }
    const activeConfig = await client.query(
      "SELECT c.configuration FROM aif_config_activations a JOIN aif_config_versions c ON c.organisation_id=a.organisation_id AND c.id=a.config_version_id WHERE a.organisation_id=$1 AND c.config_key='sg-aif-runtime' ORDER BY a.activated_at DESC LIMIT 1",
      [scope.organisationId]
    );
    const retentionCeiling = activeConfig.rows[0]?.configuration?.memoryRetentionDays ?? 30;
    if (memory.ttlDays > retentionCeiling) {
      return reply.code(400).send({ error:"memory_retention_ceiling_exceeded",maximumDays:retentionCeiling });
    }
    const { rows } = await client.query(
      "INSERT INTO aif_memory_records (organisation_id,memory_type,memory_key,value,classification,source_reference,created_by,expires_at) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,now()+($8::int * interval '1 day')) RETURNING id,memory_type,memory_key,classification,source_reference,expires_at,created_at",
      [scope.organisationId,memory.memoryType,memory.memoryKey,JSON.stringify(memory.value),memory.classification,memory.sourceReference,user.userId,memory.ttlDays]
    );
    await client.query(
      "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'aif.memory.created','aif_memory',$3,'success')",
      [scope.organisationId,user.userId,rows[0].id]
    );
    reply.code(201);
    return { data: rows[0] };
  }));

  app.get("/api/aif/plugins", async (request, reply) => requireScope(request, reply, "aif:read", async client => {
    const { rows } = await client.query(
      "SELECT id,plugin_id,name,version,lifecycle_status,connection_status,manifest_sha256,capabilities,requested_scopes,created_at,updated_at FROM aif_plugin_registry ORDER BY name,version DESC LIMIT $1",
      [boundedLimit(request.query?.limit)]
    );
    return { data: rows };
  }));

  app.post("/api/aif/plugins", async (request, reply) => requireScope(request, reply, "aif:configure", async (client, user, _membership, scope) => {
    const body = request.body || {};
    if (typeof body.pluginId !== "string" || !/^[a-z0-9][a-z0-9._-]{2,99}$/.test(body.pluginId) ||
        typeof body.name !== "string" || !body.name.trim() || body.name.length > 200 ||
        typeof body.version !== "string" || !/^\d+\.\d+\.\d+([+-][a-z0-9.-]+)?$/i.test(body.version) ||
        typeof body.manifestSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(body.manifestSha256) ||
        !Array.isArray(body.capabilities) || body.capabilities.length > 100 ||
        body.capabilities.some(value => typeof value !== "string" || !value.trim() || value.length > 120) ||
        !Array.isArray(body.requestedScopes) || body.requestedScopes.length > 50 ||
        body.requestedScopes.some(value => typeof value !== "string" || !value.trim() || value.length > 120)) {
      return reply.code(400).send({ error:"invalid_plugin_registration" });
    }
    const { rows } = await client.query(
      "INSERT INTO aif_plugin_registry (organisation_id,plugin_id,name,version,lifecycle_status,connection_status,manifest_sha256,capabilities,requested_scopes,discovered_by) VALUES ($1,$2,$3,$4,'discovered','not_configured',$5,$6::jsonb,$7::jsonb,$8) ON CONFLICT (organisation_id,plugin_id,version) DO NOTHING RETURNING id,plugin_id,name,version,lifecycle_status,connection_status,manifest_sha256,capabilities,requested_scopes,created_at",
      [scope.organisationId,body.pluginId,body.name.trim(),body.version,body.manifestSha256.toLowerCase(),JSON.stringify(body.capabilities),JSON.stringify(body.requestedScopes),user.userId]
    );
    if (!rows[0]) return reply.code(409).send({ error:"plugin_version_already_registered" });
    await client.query(
      "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'aif.plugin.discovered','aif_plugin',$3,'success')",
      [scope.organisationId,user.userId,rows[0].id]
    );
    reply.code(201);
    return { data: rows[0] };
  }));

  app.get("/api/aif/configurations", async (request, reply) => requireScope(request, reply, "aif:read", async client => {
    const { rows } = await client.query(
      "SELECT c.id,c.config_key,c.version,c.configuration,c.created_by,c.created_at,a.decision AS latest_decision,a.approver_user_id AS latest_approver,act.activated_at FROM aif_config_versions c LEFT JOIN LATERAL (SELECT decision,approver_user_id FROM aif_config_approvals WHERE config_version_id=c.id ORDER BY created_at DESC LIMIT 1) a ON true LEFT JOIN LATERAL (SELECT activated_at FROM aif_config_activations WHERE config_version_id=c.id ORDER BY activated_at DESC LIMIT 1) act ON true ORDER BY c.config_key,c.version DESC LIMIT $1",
      [boundedLimit(request.query?.limit)]
    );
    return { data: rows };
  }));

  app.post("/api/aif/configurations", async (request, reply) => requireScope(request, reply, "aif:configure", async (client, user, _membership, scope) => {
    const body = request.body || {};
    if (typeof body.configKey !== "string" || !/^[a-z0-9][a-z0-9._-]{2,99}$/.test(body.configKey)) {
      return reply.code(400).send({ error:"invalid_config_key" });
    }
    let configuration;
    try { configuration = validateAifConfiguration(body.configuration); }
    catch (error) { return reply.code(400).send({ error:"invalid_configuration",message:error.message }); }
    const versionResult = await client.query(
      "SELECT COALESCE(MAX(version),0)+1 AS next_version FROM aif_config_versions WHERE organisation_id=$1 AND config_key=$2",
      [scope.organisationId,body.configKey]
    );
    const { rows } = await client.query(
      "INSERT INTO aif_config_versions (organisation_id,config_key,version,configuration,created_by) VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id,config_key,version,configuration,created_at",
      [scope.organisationId,body.configKey,versionResult.rows[0].next_version,JSON.stringify(configuration),user.userId]
    );
    await client.query(
      "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'aif.configuration.drafted','aif_configuration',$3,'success')",
      [scope.organisationId,user.userId,rows[0].id]
    );
    reply.code(201);
    return { data: rows[0], activationRequired: true, approvalRequired: true };
  }));

  app.post("/api/aif/configurations/:id/approve", async (request, reply) => requireScope(request, reply, "aif:approve", async (client, user, _membership, scope) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error:"invalid_configuration_id" });
    const decision = request.body?.decision;
    if (!["approved","rejected"].includes(decision)) return reply.code(400).send({ error:"decision_must_be_approved_or_rejected" });
    const config = await client.query("SELECT id,created_by FROM aif_config_versions WHERE organisation_id=$1 AND id=$2",[scope.organisationId,request.params.id]);
    if (!config.rows[0]) return reply.code(404).send({ error:"configuration_not_found" });
    if (config.rows[0].created_by === user.userId) return reply.code(403).send({ error:"configuration_maker_checker_separation_required" });
    const { rows } = await client.query(
      "INSERT INTO aif_config_approvals (organisation_id,config_version_id,approver_user_id,decision,rationale) VALUES ($1,$2,$3,$4,$5) RETURNING id,decision,created_at",
      [scope.organisationId,request.params.id,user.userId,decision,typeof request.body?.rationale==="string"?request.body.rationale.slice(0,1000):""]
    );
    return { data: rows[0] };
  }));

  app.post("/api/aif/configurations/:id/activate", async (request, reply) => requireScope(request, reply, "aif:configure", async (client, user, _membership, scope) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error:"invalid_configuration_id" });
    const config = await client.query("SELECT id,created_by FROM aif_config_versions WHERE organisation_id=$1 AND id=$2",[scope.organisationId,request.params.id]);
    if (!config.rows[0]) return reply.code(404).send({ error:"configuration_not_found" });
    const approval = await client.query(
      "SELECT decision,approver_user_id FROM aif_config_approvals WHERE organisation_id=$1 AND config_version_id=$2 ORDER BY created_at DESC LIMIT 1",
      [scope.organisationId,request.params.id]
    );
    if (!approval.rows[0] || approval.rows[0].decision !== "approved" ||
        approval.rows[0].approver_user_id === config.rows[0].created_by ||
        user.userId === config.rows[0].created_by) {
      return reply.code(403).send({ error:"independent_configuration_approval_required" });
    }
    const { rows } = await client.query(
      "INSERT INTO aif_config_activations (organisation_id,config_version_id,activated_by) VALUES ($1,$2,$3) RETURNING id,config_version_id,activated_at",
      [scope.organisationId,request.params.id,user.userId]
    );
    return { data: rows[0] };
  }));

  app.get("/api/financial-routing/decisions", async (request, reply) => requireScope(request, reply, "financial-routing:read", async client => {
    const { rows } = await client.query(
      "SELECT id,request_reference,amount_minor,currency,corridor,candidate_routes,hard_gates,decision_status,block_reasons,selected_route,execution_allowed,created_at FROM financial_route_decisions ORDER BY created_at DESC LIMIT $1",
      [boundedLimit(request.query?.limit)]
    );
    return { data: rows };
  }));

  app.post("/api/financial-routing/decisions", async (request, reply) => requireScope(request, reply, "financial-routing:prepare", async (client, user, _membership, scope) => {
    let decision;
    try { decision = buildFinancialRouteDecision(request.body, { mandate:null, killSwitchActive:true }); }
    catch (error) { return reply.code(400).send({ error:"invalid_route_request",message:error.message }); }
    const { rows } = await client.query(
      "INSERT INTO financial_route_decisions (organisation_id,request_reference,amount_minor,currency,corridor,candidate_routes,hard_gates,decision_status,block_reasons,selected_route,execution_allowed,created_by) VALUES ($1,$2,$3::numeric,$4,$5,$6::jsonb,$7::jsonb,$8,$9::jsonb,NULL,false,$10) RETURNING id,request_reference,amount_minor,currency,corridor,decision_status,block_reasons,selected_route,execution_allowed,created_at",
      [scope.organisationId,decision.requestReference,decision.amountMinor,decision.currency,decision.corridor,JSON.stringify(decision.candidateRoutes),JSON.stringify(decision.hardGates),decision.status,JSON.stringify(decision.blockReasons),user.userId]
    );
    await client.query(
      "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome) VALUES ($1,$2,'financial_route.proposed','financial_route_decision',$3,'blocked')",
      [scope.organisationId,user.userId,rows[0].id]
    );
    reply.code(201);
    return { data: rows[0] };
  }));
}
