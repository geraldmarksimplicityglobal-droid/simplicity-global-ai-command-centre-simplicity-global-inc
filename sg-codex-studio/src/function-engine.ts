export const FUNCTION_TYPES = [
  "GenerateText", "GenerateImage", "GenerateAudio", "GenerateVideo", "Draft", "Summarize", "Translate", "Convert", "Resize", "Compress",
  "Encrypt", "Decrypt", "Validate", "Lint", "Test", "Score", "Predict", "Detect", "Classify", "Search", "Filter", "Sort", "Group", "Merge", "Split", "Clone", "Archive", "Delete", "Restore", "Notify"
] as const;

export type FunctionName = typeof FUNCTION_TYPES[number];
export type FunctionAvailability = "local" | "provider_required" | "approval_required";
export interface FunctionDefinition {
  name: FunctionName;
  category: "model" | "media" | "data" | "security" | "workflow" | "communication";
  availability: FunctionAvailability;
  requiresApproval: boolean;
  description: string;
}
export type FunctionErrorCode = "UNKNOWN_FUNCTION" | "INVALID_INPUT" | "FUNCTION_UNAVAILABLE" | "APPROVAL_REQUIRED";

export class FunctionExecutionError extends Error {
  constructor(public readonly code: FunctionErrorCode, message: string) {
    super(message);
    this.name = "FunctionExecutionError";
  }
}

const localDescriptions: Partial<Record<FunctionName, string>> = {
  Convert: "Convert JSON scalar values using explicit target types",
  Validate: "Check required properties on a JSON object",
  Search: "Search a string or JSON value for a substring",
  Filter: "Filter object arrays by a direct property value",
  Sort: "Stable sort of object arrays by a scalar property",
  Group: "Group object arrays by a direct property",
  Merge: "Merge JSON objects with an explicit conflict policy",
  Split: "Split a string using a selected separator",
  Clone: "Create a JSON-safe deep copy"
};

const approvalFunctions = new Set<FunctionName>(["Encrypt", "Decrypt", "Archive", "Delete", "Restore"]);
const modelFunctions = new Set<FunctionName>(["GenerateText", "GenerateImage", "GenerateAudio", "GenerateVideo", "Draft", "Summarize", "Translate", "Score", "Predict", "Detect", "Classify"]);
const mediaFunctions = new Set<FunctionName>(["Resize", "Compress"]);
const communicationFunctions = new Set<FunctionName>(["Notify"]);
const localFunctions = new Set<FunctionName>(Object.keys(localDescriptions) as FunctionName[]);

function definition(name: FunctionName): FunctionDefinition {
  const availability: FunctionAvailability = localFunctions.has(name) ? "local" : approvalFunctions.has(name) ? "approval_required" : "provider_required";
  const category: FunctionDefinition["category"] = modelFunctions.has(name) ? "model" : mediaFunctions.has(name) ? "media" : approvalFunctions.has(name) ? "security" : communicationFunctions.has(name) ? "communication" : ["Lint", "Test"].includes(name) ? "workflow" : "data";
  return {
    name,
    category,
    availability,
    requiresApproval: approvalFunctions.has(name),
    description: localDescriptions[name] ?? (availability === "approval_required" ? "Deferred: requires a separately approved security or state-changing adapter" : "Deferred: requires a connected provider or dedicated adapter")
  };
}

function inputRecord(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new FunctionExecutionError("INVALID_INPUT", "Function input must be a JSON object");
  return input as Record<string, unknown>;
}
function stringField(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.length === 0) throw new FunctionExecutionError("INVALID_INPUT", field + " must be a non-empty string");
  return value;
}
function objectItems(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some(item => item === null || typeof item !== "object" || Array.isArray(item))) {
    throw new FunctionExecutionError("INVALID_INPUT", "items must be an array of JSON objects");
  }
  return value as Record<string, unknown>[];
}
function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function validateJsonValue(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new FunctionExecutionError("INVALID_INPUT", "value must be JSON-compatible");
    return;
  }
  if (typeof value !== "object") throw new FunctionExecutionError("INVALID_INPUT", "value must be JSON-compatible");
  if (seen.has(value)) throw new FunctionExecutionError("INVALID_INPUT", "value cannot contain cyclic references");
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) throw new FunctionExecutionError("INVALID_INPUT", "value must contain only plain JSON objects and arrays");
  seen.add(value);
  for (const item of Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)) validateJsonValue(item, seen);
  seen.delete(value);
}

export class FunctionEngine {
  list(): FunctionDefinition[] {
    return FUNCTION_TYPES.map(definition);
  }

  execute(name: string, input: unknown): unknown {
    if (!(FUNCTION_TYPES as readonly string[]).includes(name)) throw new FunctionExecutionError("UNKNOWN_FUNCTION", "Unknown function: " + name);
    const functionName = name as FunctionName;
    const def = definition(functionName);
    if (def.availability === "approval_required") throw new FunctionExecutionError("APPROVAL_REQUIRED", name + " is registered but cannot run without a separately approved adapter");
    if (def.availability !== "local") throw new FunctionExecutionError("FUNCTION_UNAVAILABLE", name + " requires a connected provider or dedicated adapter; no operation was performed");
    const args = inputRecord(input);

    switch (functionName) {
      case "Convert": {
        const target = stringField(args, "to").toLowerCase();
        const value = args.value;
        if (target === "string") {
          if (value === null || ["string", "number", "boolean"].includes(typeof value)) return String(value);
          throw new FunctionExecutionError("INVALID_INPUT", "string conversion accepts only scalar values");
        }
        if (target === "number") {
          const converted = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
          if (!Number.isFinite(converted)) throw new FunctionExecutionError("INVALID_INPUT", "number conversion requires a finite number or numeric string");
          return converted;
        }
        if (target === "boolean") {
          if (typeof value === "boolean") return value;
          if (typeof value === "string" && ["true", "false"].includes(value.toLowerCase())) return value.toLowerCase() === "true";
          throw new FunctionExecutionError("INVALID_INPUT", "boolean conversion accepts only true or false");
        }
        throw new FunctionExecutionError("INVALID_INPUT", "to must be string, number or boolean");
      }
      case "Validate": {
        const value = inputRecord(args.value);
        if (!Array.isArray(args.required) || args.required.some(field => typeof field !== "string")) throw new FunctionExecutionError("INVALID_INPUT", "required must be an array of property names");
        const missing = (args.required as string[]).filter(field => !Object.hasOwn(value, field));
        return { valid: missing.length === 0, missing };
      }
      case "Search": {
        if (typeof args.query !== "string") throw new FunctionExecutionError("INVALID_INPUT", "query must be a string");
        validateJsonValue(args.value);
        const haystack = typeof args.value === "string" ? args.value : JSON.stringify(args.value);
        return { found: haystack.toLocaleLowerCase().includes(args.query.toLocaleLowerCase()), query: args.query };
      }
      case "Filter": {
        const items = objectItems(args.items);
        const field = stringField(args, "field");
        if (!Object.hasOwn(args, "equals")) throw new FunctionExecutionError("INVALID_INPUT", "equals must be supplied");
        return items.filter(item => Object.hasOwn(item, field) && sameJson(item[field], args.equals));
      }
      case "Sort": {
        const items = objectItems(args.items);
        const field = stringField(args, "field");
        const direction = args.direction ?? "asc";
        if (direction !== "asc" && direction !== "desc") throw new FunctionExecutionError("INVALID_INPUT", "direction must be asc or desc");
        const values = items.map(item => item[field]);
        if (values.some(value => !["string", "number", "boolean"].includes(typeof value) || (typeof value === "number" && !Number.isFinite(value)))) throw new FunctionExecutionError("INVALID_INPUT", "sort field values must be finite scalar values");
        if (new Set(values.map(value => typeof value)).size > 1) throw new FunctionExecutionError("INVALID_INPUT", "sort field values must have the same scalar type");
        return items.map((item, index) => ({ item, index })).sort((a, b) => {
          const av = a.item[field] as string | number | boolean;
          const bv = b.item[field] as string | number | boolean;
          let compared: number;
          if (typeof av === "string" && typeof bv === "string") compared = av.localeCompare(bv);
          else if (typeof av === "number" && typeof bv === "number") compared = av - bv;
          else compared = Number(av) - Number(bv);
          return (direction === "asc" ? compared : -compared) || a.index - b.index;
        }).map(entry => entry.item);
      }
      case "Group": {
        const items = objectItems(args.items);
        const field = stringField(args, "field");
        const groups = new Map<string, Record<string, unknown>[]>();
        for (const item of items) {
          if (!Object.hasOwn(item, field)) throw new FunctionExecutionError("INVALID_INPUT", "every item must contain the group field");
          const key = String(item[field]);
          const group = groups.get(key) ?? [];
          group.push(item);
          groups.set(key, group);
        }
        return Object.fromEntries(groups);
      }
      case "Merge": {
        if (!Array.isArray(args.objects) || args.objects.some(item => item === null || typeof item !== "object" || Array.isArray(item))) throw new FunctionExecutionError("INVALID_INPUT", "objects must be an array of JSON objects");
        const strategy = args.strategy ?? "error";
        if (!["error", "first", "last"].includes(String(strategy))) throw new FunctionExecutionError("INVALID_INPUT", "strategy must be error, first or last");
        const result: Record<string, unknown> = {};
        for (const object of args.objects as Record<string, unknown>[]) {
          for (const [key, value] of Object.entries(object)) {
            if (Object.hasOwn(result, key)) {
              if (strategy === "error") throw new FunctionExecutionError("INVALID_INPUT", "Merge conflict on property: " + key);
              if (strategy === "first") continue;
            }
            Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true });
          }
        }
        return result;
      }
      case "Split": {
        if (typeof args.value !== "string") throw new FunctionExecutionError("INVALID_INPUT", "value must be a string");
        const separator = args.separator === undefined ? "\n" : args.separator;
        if (typeof separator !== "string") throw new FunctionExecutionError("INVALID_INPUT", "separator must be a string");
        const limit = args.limit === undefined ? undefined : args.limit;
        if (limit !== undefined && (!Number.isInteger(limit) || (limit as number) < 0)) throw new FunctionExecutionError("INVALID_INPUT", "limit must be a non-negative integer");
        return args.value.split(separator, limit as number | undefined);
      }
      case "Clone": {
        if (!Object.hasOwn(args, "value")) throw new FunctionExecutionError("INVALID_INPUT", "value must be supplied");
        validateJsonValue(args.value);
        return JSON.parse(JSON.stringify(args.value)) as unknown;
      }
      default:
        throw new FunctionExecutionError("FUNCTION_UNAVAILABLE", name + " is not implemented in the local execution set");
    }
  }
}
