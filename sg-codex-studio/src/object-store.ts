import {
  existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { ObjectEngine, type ObjectAuditEvent, type ObjectRecord } from "./object-engine.js";
import { isObjectType, type ObjectType } from "./object-types.js";

export interface ObjectStoreSnapshot {
  schemaVersion: 1;
  records: ObjectRecord[];
  auditEvents: ObjectAuditEvent[];
}

export interface FileObjectStoreOptions {
  now?: () => Date;
  idFactory?: () => string;
}

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`Forbidden object field: ${key}`);
    result[key] = structuredClone(value);
  }
  return result;
}

function validateSnapshot(value: unknown): ObjectStoreSnapshot {
  if (!isRecord(value) || value.schemaVersion !== 1 ||
      !Array.isArray(value.records) || !Array.isArray(value.auditEvents)) {
    throw new Error("Object store file has an unsupported or invalid schema");
  }

  const ids = new Set<string>();
  const records = value.records.map((item): ObjectRecord => {
    if (!isRecord(item) || typeof item.id !== "string" ||
        typeof item.type !== "string" || !isObjectType(item.type) ||
        !isRecord(item.data) || typeof item.createdAt !== "string" ||
        typeof item.updatedAt !== "string" ||
        !Number.isInteger(item.version) || (item.version as number) < 1) {
      throw new Error("Object store contains an invalid record");
    }
    if (ids.has(item.id)) throw new Error("Object store contains duplicate record IDs");
    ids.add(item.id);
    return {
      id: item.id,
      type: item.type,
      data: cloneData(item.data),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      version: item.version as number
    };
  });

  const auditEvents = value.auditEvents.map((item): ObjectAuditEvent => {
    if (!isRecord(item) ||
        !["CREATE", "UPDATE", "DELETE"].includes(String(item.action)) ||
        typeof item.objectId !== "string" ||
        typeof item.objectType !== "string" || !isObjectType(item.objectType) ||
        typeof item.occurredAt !== "string") {
      throw new Error("Object store contains an invalid audit event");
    }
    return {
      action: item.action as ObjectAuditEvent["action"],
      objectId: item.objectId,
      objectType: item.objectType,
      occurredAt: item.occurredAt
    };
  });

  return { schemaVersion: 1, records, auditEvents };
}

/**
 * Local JSON persistence for the Object Engine starter.
 * This is a single-process development store, not a multi-writer database.
 */
export class FileObjectStore {
  private readonly filePath: string;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private readonly validator = new ObjectEngine();
  private snapshot: ObjectStoreSnapshot;

  constructor(filePath = ".sg-codex/objects.json", options: FileObjectStoreOptions = {}) {
    this.filePath = resolve(filePath);
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    this.snapshot = this.readSnapshot();
  }

  listTypes() {
    return this.validator.listTypes();
  }

  validate(type: string, data: unknown): string[] {
    return this.validator.validate(type, data);
  }

  create(type: string, data: unknown): ObjectRecord {
    const errors = this.validate(type, data);
    if (errors.length || !isObjectType(type) || !isRecord(data)) {
      throw new Error(errors.join("; ") || "Invalid object input");
    }
    const timestamp = this.now().toISOString();
    const record: ObjectRecord = {
      id: this.idFactory(),
      type,
      data: cloneData(data),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1
    };
    if (this.snapshot.records.some(item => item.id === record.id)) {
      throw new Error(`Object ID already exists: ${record.id}`);
    }
    this.snapshot.records.push(record);
    this.audit("CREATE", record);
    this.persist();
    return structuredClone(record);
  }

  get(id: string): ObjectRecord | undefined {
    const record = this.snapshot.records.find(item => item.id === id);
    return record ? structuredClone(record) : undefined;
  }

  list(type?: ObjectType): ObjectRecord[] {
    return this.snapshot.records
      .filter(record => type === undefined || record.type === type)
      .map(record => structuredClone(record));
  }

  update(id: string, patch: unknown): ObjectRecord {
    const existing = this.snapshot.records.find(item => item.id === id);
    if (!existing) throw new Error(`Object not found: ${id}`);
    if (!isRecord(patch)) throw new Error("Object patch must be a plain JSON object");
    const data = cloneData({ ...existing.data, ...patch });
    const updated: ObjectRecord = {
      ...existing,
      data,
      updatedAt: this.now().toISOString(),
      version: existing.version + 1
    };
    this.snapshot.records = this.snapshot.records.map(item => item.id === id ? updated : item);
    this.audit("UPDATE", updated);
    this.persist();
    return structuredClone(updated);
  }

  delete(id: string, options: { allowDelete: boolean }): boolean {
    if (options?.allowDelete !== true) {
      throw new Error("Delete requires explicit allowDelete: true approval");
    }
    const existing = this.snapshot.records.find(item => item.id === id);
    if (!existing) return false;
    this.snapshot.records = this.snapshot.records.filter(item => item.id !== id);
    this.audit("DELETE", existing);
    this.persist();
    return true;
  }

  getAuditLog(): ObjectAuditEvent[] {
    return structuredClone(this.snapshot.auditEvents);
  }

  private readSnapshot(): ObjectStoreSnapshot {
    if (!existsSync(this.filePath)) {
      return { schemaVersion: 1, records: [], auditEvents: [] };
    }
    if (lstatSync(this.filePath).isSymbolicLink()) {
      throw new Error("Refusing to read an object store symbolic link");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(this.filePath, "utf8"));
    } catch (error) {
      throw new Error(`Unable to read object store JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    return validateSnapshot(parsed);
  }

  private persist(): void {
    const directory = dirname(this.filePath);
    mkdirSync(directory, { recursive: true });
    if (existsSync(this.filePath) && lstatSync(this.filePath).isSymbolicLink()) {
      throw new Error("Refusing to replace an object store symbolic link");
    }
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporaryPath, JSON.stringify(this.snapshot, null, 2) + "\n", {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600
      });
      renameSync(temporaryPath, this.filePath);
    } finally {
      if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    }
  }

  private audit(action: ObjectAuditEvent["action"], record: ObjectRecord): void {
    this.snapshot.auditEvents.push({
      action,
      objectId: record.id,
      objectType: record.type,
      occurredAt: this.now().toISOString()
    });
  }
}
