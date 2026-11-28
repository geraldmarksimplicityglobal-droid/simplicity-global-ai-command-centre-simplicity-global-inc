import { randomUUID } from "node:crypto";
import {
  createTask,
  transitionTask,
  approveTask,
  authorizeExecution
} from "../../../AGENTIC-MULTI-IDE-CLI/src/workflow.mjs";
import { isUuid } from "./scope.js";

function validText(value, max, field, optional = false) {
  if (optional && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new TypeError(field + " is invalid");
  }
  return value.trim();
}

function auditTask(client, organisationId, actorUserId, action, taskId, details) {
  return client.query(
    "INSERT INTO audit_events (organisation_id,actor_user_id,action,target_type,target_id,outcome,details) VALUES ($1,$2,$3,'workflow_task',$4,'success',$5::jsonb)",
    [organisationId, actorUserId, action, taskId, JSON.stringify(details ?? {})]
  );
}

async function appendEvents(client, organisationId, task, afterSequence = 0) {
  for (const event of task.events.filter(item => item.sequence > afterSequence)) {
    await client.query(
      "INSERT INTO workflow_task_events (organisation_id,task_id,sequence,event_type,actor_user_id,details,occurred_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)",
      [organisationId, task.id, event.sequence, event.type, event.actor, JSON.stringify(event.details ?? {}), event.at]
    );
  }
}

async function mutateTask(client, user, organisationId, taskId, reply, mutation) {
  const locked = await client.query(
    "SELECT task_data,last_event_sequence FROM workflow_tasks WHERE organisation_id=$1 AND id=$2 FOR UPDATE",
    [organisationId, taskId]
  );
  if (!locked.rowCount) return reply.code(404).send({ error: "workflow_task_not_found" });

  const task = locked.rows[0].task_data;
  const previousSequence = Number(locked.rows[0].last_event_sequence);
  try {
    mutation(task);
  } catch (error) {
    return reply.code(409).send({ error: "workflow_transition_rejected", message: error.message });
  }

  const nextSequence = task.events.length;
  const saved = await client.query(
    "UPDATE workflow_tasks SET status=$3,task_data=$4::jsonb,last_event_sequence=$5,updated_at=now() WHERE organisation_id=$1 AND id=$2 AND last_event_sequence=$6 RETURNING id",
    [organisationId, taskId, task.status, JSON.stringify(task), nextSequence, previousSequence]
  );
  if (!saved.rowCount) return reply.code(409).send({ error: "workflow_task_concurrency_conflict" });

  await appendEvents(client, organisationId, task, previousSequence);
  await auditTask(client, organisationId, user.userId, "workflow_task." + task.status, taskId, {
    status: task.status,
    eventSequence: nextSequence
  });
  return { data: task };
}

export function registerWorkflowRoutes(app, requireScope) {
  app.get("/api/workflow/tasks", async (request, reply) =>
    requireScope(request, reply, "workflow:read", async client => {
      const { rows } = await client.query(
        "SELECT task_data FROM workflow_tasks ORDER BY updated_at DESC LIMIT 100"
      );
      return { data: rows.map(row => row.task_data) };
    })
  );

  app.post("/api/workflow/tasks", async (request, reply) =>
    requireScope(request, reply, "workflow:request", async (client, user, _membership, scope) => {
      const body = request.body || {};
      let input;
      try {
        input = {
          id: randomUUID(),
          title: validText(body.title, 200, "title"),
          objective: validText(body.objective, 5000, "objective"),
          risk: body.risk ?? "medium",
          repository: validText(body.repository, 300, "repository", true),
          branch: validText(body.branch, 255, "branch", true)
        };
      } catch (error) {
        return reply.code(400).send({ error: "invalid_workflow_task", message: error.message });
      }

      let task;
      try {
        task = createTask(input, user.userId);
      } catch (error) {
        return reply.code(400).send({ error: "invalid_workflow_task", message: error.message });
      }

      await client.query(
        "INSERT INTO workflow_tasks (id,organisation_id,created_by,title,objective,risk_level,status,repository,branch,task_data,last_event_sequence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)",
        [task.id, scope.organisationId, user.userId, task.title, task.objective, task.risk, task.status,
          task.repository, task.branch, JSON.stringify(task), task.events.length]
      );
      await appendEvents(client, scope.organisationId, task);
      await auditTask(client, scope.organisationId, user.userId, "workflow_task.submitted", task.id, {
        risk: task.risk,
        eventSequence: task.events.length
      });
      reply.code(201);
      return { data: task };
    })
  );

  app.get("/api/workflow/tasks/:taskId", async (request, reply) =>
    requireScope(request, reply, "workflow:read", async (client, _user, _membership, scope) => {
      const taskId = request.params?.taskId;
      if (!isUuid(taskId)) return reply.code(400).send({ error: "invalid_workflow_task_id" });
      const { rows } = await client.query(
        "SELECT task_data FROM workflow_tasks WHERE organisation_id=$1 AND id=$2 LIMIT 1",
        [scope.organisationId, taskId]
      );
      if (!rows.length) return reply.code(404).send({ error: "workflow_task_not_found" });
      return { data: rows[0].task_data };
    })
  );

  app.get("/api/workflow/tasks/:taskId/events", async (request, reply) =>
    requireScope(request, reply, "workflow:read", async (client, _user, _membership, scope) => {
      const taskId = request.params?.taskId;
      if (!isUuid(taskId)) return reply.code(400).send({ error: "invalid_workflow_task_id" });
      const { rows } = await client.query(
        "SELECT sequence,event_type,actor_user_id,details,occurred_at FROM workflow_task_events WHERE organisation_id=$1 AND task_id=$2 ORDER BY sequence ASC",
        [scope.organisationId, taskId]
      );
      return { data: rows };
    })
  );

  app.post("/api/workflow/tasks/:taskId/transition", async (request, reply) =>
    requireScope(request, reply, "workflow:manage", async (client, user, _membership, scope) => {
      const taskId = request.params?.taskId;
      if (!isUuid(taskId)) return reply.code(400).send({ error: "invalid_workflow_task_id" });
      const body = request.body || {};
      if (typeof body.nextStatus !== "string") return reply.code(400).send({ error: "next_status_required" });
      return mutateTask(client, user, scope.organisationId, taskId, reply, task =>
        transitionTask(task, body.nextStatus, user.userId, {})
      );
    })
  );

  app.post("/api/workflow/tasks/:taskId/approve", async (request, reply) =>
    requireScope(request, reply, "workflow:approve", async (client, user, _membership, scope) => {
      const taskId = request.params?.taskId;
      if (!isUuid(taskId)) return reply.code(400).send({ error: "invalid_workflow_task_id" });
      const body = request.body || {};
      const decision = body.decision ?? "approve";
      if (!["approve", "reject"].includes(decision) ||
          (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 2000))) {
        return reply.code(400).send({ error: "invalid_workflow_approval" });
      }
      return mutateTask(client, user, scope.organisationId, taskId, reply, task =>
        approveTask(task, user.userId, decision, body.reason ?? "")
      );
    })
  );

  app.post("/api/workflow/tasks/:taskId/authorize", async (request, reply) =>
    requireScope(request, reply, "workflow:authorize", async (client, user, _membership, scope) => {
      const taskId = request.params?.taskId;
      if (!isUuid(taskId)) return reply.code(400).send({ error: "invalid_workflow_task_id" });
      const body = request.body || {};
      if (!Array.isArray(body.operations) || body.operations.length < 1 || body.operations.length > 10 ||
          body.operations.some(value => typeof value !== "string" || !value.trim() || value.length > 120) ||
          (body.resources !== undefined && (!Array.isArray(body.resources) || body.resources.length > 20 ||
            body.resources.some(value => typeof value !== "string" || !value.trim() || value.length > 300)))) {
        return reply.code(400).send({ error: "invalid_execution_scope" });
      }
      return mutateTask(client, user, scope.organisationId, taskId, reply, task =>
        authorizeExecution(task, user.userId, { operations: body.operations, resources: body.resources ?? [] })
      );
    })
  );
}
