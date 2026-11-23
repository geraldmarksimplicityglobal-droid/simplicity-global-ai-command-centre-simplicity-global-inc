export const OBJECT_TYPES = [
  "Text", "Number", "Boolean", "Date", "List", "Map", "File", "Link",
  "Tag", "Comment", "User", "Team", "Role", "Task", "Project", "Order",
  "Product", "Invoice", "Event", "Place", "Image", "Audio", "Video", "Model",
  "Note", "Page", "Block", "Form", "Chart", "Dashboard"
] as const;

export type ObjectType = typeof OBJECT_TYPES[number];

export interface ObjectTypeDefinition {
  type: ObjectType;
  description: string;
}

export const OBJECT_TYPE_REGISTRY: readonly ObjectTypeDefinition[] = Object.freeze(
  OBJECT_TYPES.map(type => Object.freeze({
    type,
    description: `${type} domain object`
  }))
);

export function isObjectType(value: string): value is ObjectType {
  return (OBJECT_TYPES as readonly string[]).includes(value);
}
