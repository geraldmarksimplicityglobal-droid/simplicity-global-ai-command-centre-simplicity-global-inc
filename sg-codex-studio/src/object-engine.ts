import { randomUUID } from "node:crypto";
import { mkdir, lstat, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const OBJECT_TYPES = [
  "Text", "Number", "Boolean", "Date", "List", "Map", "File", "Link", "Tag", "Comment",
  "User", "Team", "Role", "Task", "Project", "Order", "Product", "Invoice", "Event", "Place",
  "Image", "Audio", "Video", "Model", "Note", "Page", "Block", "Form", "Chart", "Dashboard"
] as const;

export type ObjectType = typeof OBJECT_TYPES[number];
export interface StoredObject {
  id: string;
  type: ObjectType;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
export interface ObjectStore {
  create(type: ObjectType, data: Record<string, unknown>, id?: string): Promise<StoredObject>;
  get(id: string): Promise<StoredObject | null>;
  list(type?: ObjectType): Promise<StoredObject[]>;
  delete(id: string): Promise<boolean>;
}

const STORE_DIR = ".sg-codex";
const STORE_FILE = "objects.json";
const MAX_OBJECT_BYTES = 1024 * 1024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
interface StoreDocument { version: 1; objects: StoredObject[] }

export function isObjectType(value: string): value is ObjectType {
  return (OBJECT_TYPES as readonly string[]).includes(value);
}

export function validateObjectData(data: unknown): asserts data is Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Object data must be a JSON object");
  }
  const seen = new WeakSet<object>();
  const inspect = (value: unknown): void => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Object data must be JSON-compatible");
      return;
    }
    if (typeof value !== "object") throw new Error("Object data must be JSON-compatible");
    if (seen.has(value)) throw new Error("Object data cannot contain cyclic references");
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
      throw new Error("Object data must contain only plain JSON objects and arrays");
    }
    seen.add(value);
    for (const item of Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)) inspect(item);
    seen.delete(value);
  };
  inspect(data);
  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized, "utf8") > MAX_OBJECT_BYTES) {
    throw new Error("Object data exceeds the 1 MiB limit");
  }
}

function validateId(id: string): void {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid object ID; use 1-128 letters, numbers, '_' or '-' and start with a letter or number");
}

export class JsonObjectStore implements ObjectStore {
  private readonly rootDir: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  private get directory(): string { return join(this.rootDir, STORE_DIR); }
  private get file(): string { return join(this.directory, STORE_FILE); }

  private async ensureDirectory(): Promise<void> {
    try {
      const stat = await lstat(this.directory);
      if (stat.isSymbolicLink()) throw new Error("Refusing symlinked .sg-codex store directory");
      if (!stat.isDirectory()) throw new Error(".sg-codex store path is not a directory");
    } catch (error) {
      if ((error as { code?: string }).code !== "ENOENT") throw error;
      await mkdir(this.directory, { recursive: false });
    }
    const stat = await lstat(this.directory);
    if (stat.isSymbolicLink()) throw new Error("Refusing symlinked .sg-codex store directory");
  }

  private async readDocument(): Promise<StoreDocument> {
    await this.ensureDirectory();
    try {
      const stat = await lstat(this.file);
      if (stat.isSymbolicLink()) throw new Error("Refusing symlinked objects.json store file");
      if (!stat.isFile()) throw new Error("Object store file is not a regular file");
      const raw = await readFile(this.file, "utf8");
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { throw new Error("Object store contains corrupt or invalid JSON; file was preserved"); }
      if (!parsed || typeof parsed !== "object" || (parsed as StoreDocument).version !== 1 || !Array.isArray((parsed as StoreDocument).objects)) {
        throw new Error("Object store has an unsupported or corrupt document format; file was preserved");
      }
      return parsed as StoreDocument;
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") return { version: 1, objects: [] };
      throw error;
    }
  }

  private async writeDocument(document: StoreDocument): Promise<void> {
    await this.ensureDirectory();
    const temporary = join(this.directory, `.objects.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(document, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
      await rename(temporary, this.file);
    } catch (error) {
      try { await import("node:fs/promises").then(fs => fs.rm(temporary, { force: true })); } catch { /* preserve original failure */ }
      throw error;
    }
  }

  private async serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.writeQueue;
    let release!: () => void;
    this.writeQueue = new Promise<void>(resolveQueue => { release = resolveQueue; });
    await previous;
    try { return await operation(); } finally { release(); }
  }

  async create(type: ObjectType, data: Record<string, unknown>, id = randomUUID()): Promise<StoredObject> {
    return this.serializeWrite(async () => {
      if (!isObjectType(String(type))) throw new Error(`Unsupported object type: ${String(type)}`);
      validateObjectData(data);
      validateId(id);
      const document = await this.readDocument();
      if (document.objects.some(item => item.id === id)) throw new Error(`Object ID already exists: ${id}`);
      const now = new Date().toISOString();
      const created: StoredObject = { id, type, data, createdAt: now, updatedAt: now };
      document.objects.push(created);
      await this.writeDocument(document);
      return created;
    });
  }

  async get(id: string): Promise<StoredObject | null> {
    validateId(id);
    const document = await this.readDocument();
    return document.objects.find(item => item.id === id) ?? null;
  }

  async list(type?: ObjectType): Promise<StoredObject[]> {
    if (type !== undefined && !isObjectType(String(type))) throw new Error(`Unsupported object type: ${String(type)}`);
    const document = await this.readDocument();
    return type ? document.objects.filter(item => item.type === type) : document.objects;
  }

  async delete(id: string): Promise<boolean> {
    return this.serializeWrite(async () => {
      validateId(id);
      const document = await this.readDocument();
      const index = document.objects.findIndex(item => item.id === id);
      if (index < 0) return false;
      document.objects.splice(index, 1);
      await this.writeDocument(document);
      return true;
    });
  }
}
