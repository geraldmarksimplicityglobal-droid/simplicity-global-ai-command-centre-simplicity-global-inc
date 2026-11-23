import { randomUUID } from "node:crypto";
import { isObjectType, OBJECT_TYPE_REGISTRY, type ObjectType } from "./object-types.js";

export interface ObjectRecord {
  id: string;
  type: ObjectType;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ObjectAuditEvent {
  action: "CREATE" | "UPDATE" | "DELETE";
  objectId: string;
  objectType: ObjectType;
  occurredAt: string;
}

export interface ObjectEngineOptions {
  now?: () => Date;
  idFactory?: () => string;
}

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function copyData(data: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`Forbidden object field: ${key}`);
    copy[key] = structuredClone(value);
  }
  return copy;
}

export class ObjectEngine {
  private readonly records = new Map<string, ObjectRecord>();
  private readonly auditEvents: ObjectAuditEvent[] = [];
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: ObjectEngineOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  listTypes(): readonly typeof OBJECT_TYPE_REGISTRY[number][] {
    return OBJECT_TYPE_REGISTRY;
  }

  validate(type: string, data: unknown): string[] {
    const errors: string[] = [];
    if (!isObjectType(type)) errors.push(`Unknown object type: ${type}`);
    if (!isPlainRecord(data)) {
      errors.push("Object data must be a plain JSON object");
      return errors;
    }
    for (const key of Object.keys(data)) {
      if (FORBIDDEN_KEYS.has(key)) errors.push(`Forbidden object field: ${key}`);
    }
    return errors;
  }

  create(type: string, data: unknown): ObjectRecord {
    const errors = this.validate(type, data);
    if (errors.length) throw new Error(errors.join("; "));
    if (!isObjectType(type) || !isPlainRecord(data)) throw new Error("Invalid object input");

    const timestamp = this.now().toISOString();
    const record: ObjectRecord = {
      id: this.idFactory(),
      type,
      data: copyData(data),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1
    };
    if (this.records.has(record.id)) throw new Error(`Object ID already exists: ${record.id}`);
    this.records.set(record.id, record);
    this.audit("CREATE", record);
    return structuredClone(record);
  }

  get(id: string): ObjectRecord | undefined {
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }

  list(type?: ObjectType): ObjectRecord[] {
    return [...this.records.values()]
      .filter(record => type === undefined || record.type === type)
      .map(record => structuredClone(record));
  }

  update(id: string, patch: unknown): ObjectRecord {
    const existing = this.records.get(id);
    if (!existing) throw new Error(`Object not found: ${id}`);
    if (!isPlainRecord(patch)) throw new Error("Object patch must be a plain JSON object");
    const data = copyData({ ...existing.data, ...patch });
    const updated: ObjectRecord = {
      ...existing,
      data,
      updatedAt: this.now().toISOString(),
      version: existing.version + 1
    };
    this.records.set(id, updated);
    this.audit("UPDATE", updated);
    return structuredClone(updated);
  }

  delete(id: string, options: { allowDelete: boolean }): boolean {
    if (options?.allowDelete !== true) {
      throw new Error("Delete requires explicit allowDelete: true approval");
    }
    const existing = this.records.get(id);
    if (!existing) return false;
    this.records.delete(id);
    this.audit("DELETE", existing);
    return true;
  }

  getAuditLog(): ObjectAuditEvent[] {
    return structuredClone(this.auditEvents);
  }

  private audit(action: ObjectAuditEvent["action"], record: ObjectRecord): void {
    this.auditEvents.push({
      action,
      objectId: record.id,
      objectType: record.type,
      occurredAt: this.now().toISOString()
    });
  }
}
