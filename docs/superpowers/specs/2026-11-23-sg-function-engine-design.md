# SG Function Engine — Design

## Intent
Add a capability registry and safe local dispatcher to the SG Codex CLI. The registry contains all 30 Function micro-types from the project specification. The first execution slice implements deterministic JSON/string operations only; provider-backed and high-impact operations remain unavailable until separately connected and approved.

## Registry
GenerateText, GenerateImage, GenerateAudio, GenerateVideo, Draft, Summarize, Translate, Convert, Resize, Compress, Encrypt, Decrypt, Validate, Lint, Test, Score, Predict, Detect, Classify, Search, Filter, Sort, Group, Merge, Split, Clone, Archive, Delete, Restore, Notify.

## Local operations in this phase
- Convert: explicit string/number/boolean conversion with strict input checks.
- Validate: check required fields on an object.
- Search: case-insensitive substring search in a string or JSON representation.
- Filter: filter an array of objects by a direct property and exact value.
- Sort: stable scalar-property sort in ascending or descending order.
- Group: group an array of objects by a direct property.
- Merge: merge objects with explicit conflict strategy (default: reject conflicts).
- Split: split a string by an explicit or newline separator.
- Clone: JSON-safe deep clone.

## Deferred capabilities
Model/provider-backed functions (generation, drafting, summarization, translation, scoring, prediction, detection, classification) are registered but unavailable without a provider. Media operations, compression, lint/test execution and notifications require future adapters. Encrypt/decrypt and archive/delete/restore remain approval-gated and are not executed in this phase.

## Safety
- No network requests, model calls, shell execution, plugin installation, file mutation, notifications or external side effects.
- Accept JSON-compatible input only; reject malformed shapes and unsupported function names.
- No implicit type coercion for boolean/number conversion.
- Merge collisions fail unless caller explicitly selects a strategy.
- Existing Object Engine and orchestrator behavior must remain unchanged.

## Interfaces
- `FUNCTION_TYPES`: readonly registry of 30 names.
- `FunctionDefinition`: name, category, availability, requiresApproval, description.
- `FunctionEngine.list()`: return registry metadata.
- `FunctionEngine.execute(name, input)`: run only the nine local operations; deferred functions return a typed unavailable error.

## Success criteria
- All 30 functions are registered exactly once.
- The nine local operations are tested for normal and invalid inputs.
- Deferred functions fail closed with an informative reason.
- CLI supports `function types` and `function run <name> <json>`.
- Existing Object Engine, Studio orchestrator and CLI tests remain green.
