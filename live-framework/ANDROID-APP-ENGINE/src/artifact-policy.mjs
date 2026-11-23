import path from "node:path";

function pathApi(value) {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\") ? path.win32 : path.posix;
}
function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) throw new TypeError(field + " must be a non-empty path string");
  return value.trim();
}
function isWithin(root, candidate, api) {
  const relative = api.relative(api.resolve(root), api.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !api.isAbsolute(relative));
}
export function classifyArtifact(filePath) {
  const input = requiredString(filePath, "filePath");
  const extension = pathApi(input).extname(input).toLowerCase();
  if (extension === ".apk") return "apk";
  if (extension === ".aab") return "aab";
  throw new Error("unsupported artifact: expected .apk or .aab");
}
export function validateArtifactRequest(request) {
  if (!request || typeof request !== "object") throw new TypeError("artifact request is required");
  if (request.authorised !== true) throw new Error("explicit authorisation for this application is required");
  const inputPath = requiredString(request.inputPath, "inputPath");
  const outputPath = requiredString(request.outputPath, "outputPath");
  const workspaceRoot = requiredString(request.workspaceRoot, "workspaceRoot");
  const api = pathApi(inputPath);
  if (api !== pathApi(outputPath) || api !== pathApi(workspaceRoot)) throw new Error("artifact paths must use one consistent path format");
  if (!api.isAbsolute(inputPath) || !api.isAbsolute(outputPath) || !api.isAbsolute(workspaceRoot)) throw new Error("artifact and workspace paths must be absolute");
  if (!isWithin(workspaceRoot, inputPath, api) || !isWithin(workspaceRoot, outputPath, api)) throw new Error("artifact path is outside approved workspace");
  const canonicalInput = api.resolve(inputPath);
  const canonicalOutput = api.resolve(outputPath);
  if (canonicalInput.toLowerCase() === canonicalOutput.toLowerCase()) throw new Error("input and output paths must differ");
  const type = classifyArtifact(canonicalInput);
  if (classifyArtifact(canonicalOutput) !== type) throw new Error("input and output artifact types must match");
  return Object.freeze({ type, inputPath: canonicalInput, outputPath: canonicalOutput, workspaceRoot: api.resolve(workspaceRoot) });
}
