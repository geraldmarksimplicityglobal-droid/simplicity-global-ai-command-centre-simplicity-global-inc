import path from 'node:path';

const READ_ONLY = new Set(['inspect-apk', 'inspect-manifest', 'inspect-dex', 'dump-badging', 'verify-signature', 'verify-alignment', 'list-packages', 'probe-tool']);
const APPROVED_WRITE = new Set(['decompile-apk', 'rebuild-apk', 'align-apk', 'sign-apk', 'launch-mt-manager']);
const TOOL_KEYS = Object.freeze({
  apkanalyzer: 'apkanalyzer', apksigner: 'apksigner', apktool: 'apktool',
  zipalign: 'zipalign', aapt: 'aapt', which: 'which', pm: 'pm', monkey: 'monkey'
});
const PACKAGE_ID = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
const ALIAS = /^[A-Za-z0-9._-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/i;

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function absoluteWorkspacePath(value, field, roots) {
  const candidate = requiredText(value, field);
  if (!path.posix.isAbsolute(candidate)) throw new TypeError(`${field} must be an absolute Android path`);
  const resolved = path.posix.resolve(candidate);
  const allowed = roots.some(root => {
    if (typeof root !== 'string' || !path.posix.isAbsolute(root)) return false;
    const relative = path.posix.relative(path.posix.resolve(root), resolved);
    return relative === '' || (!relative.startsWith('..') && !path.posix.isAbsolute(relative));
  });
  if (!allowed) throw new Error(`${field} is outside approved workspace roots`);
  return resolved;
}

function requireApproval(request, operation, resource) {
  const { approval, executionAuthorization, taskId } = request;
  const now = Date.now();
  const validApproval = approval?.approved === true &&
    typeof approval.approvalId === 'string' && approval.approvalId.trim() !== '' &&
    approval.taskId === taskId && approval.operation === operation &&
    approval.resource === resource && typeof approval.reviewer === 'string' &&
    approval.reviewer.trim() !== '' && Number.isFinite(approval.expiresAt) && approval.expiresAt > now;
  if (!validApproval) throw new Error('valid scoped approval is required');

  const validExecution = executionAuthorization?.allowed === true &&
    typeof executionAuthorization.authorizationId === 'string' && executionAuthorization.authorizationId.trim() !== '' &&
    executionAuthorization.taskId === taskId && executionAuthorization.operation === operation &&
    executionAuthorization.resource === resource && typeof executionAuthorization.actor === 'string' &&
    executionAuthorization.actor.trim() !== '' && Number.isFinite(executionAuthorization.expiresAt) &&
    executionAuthorization.expiresAt > now;
  if (!validExecution) throw new Error('valid scoped execution authorization is required');
  if (operation === 'sign-apk' && executionAuthorization.actor === approval.reviewer) {
    throw new Error('APK signing executor must be different from reviewer');
  }
  return Object.freeze({ approvalId: approval.approvalId, authorizationId: executionAuthorization.authorizationId });
}

function artifactResource(request, inputPath, outputPath, extra = {}) {
  const digest = requiredText(request.artifactSha256, 'artifactSha256');
  if (!SHA256.test(digest)) throw new TypeError('artifactSha256 must be a 64-character SHA-256 hex digest');
  return JSON.stringify({ inputPath, sha256: digest.toLowerCase(), outputPath, ...extra });
}

function tool(policy, key) {
  const configured = policy.tools?.[key];
  if (typeof configured !== 'string' || !path.posix.isAbsolute(configured)) {
    throw new Error(`Android tool is not configured: ${key}`);
  }
  return configured;
}

export const ANDROID_TERMUX_ADAPTER = Object.freeze({
  id: 'android-termux',
  platform: 'android',
  runtime: 'termux-or-android-shell-bridge',
  permissionTier: 'read-only-by-default',
  supportsShell: false,
  operations: Object.freeze([
    'inspect-apk', 'inspect-manifest', 'inspect-dex', 'dump-badging', 'verify-signature', 'verify-alignment', 'list-packages', 'probe-tool',
    'decompile-apk', 'rebuild-apk', 'align-apk', 'sign-apk', 'launch-mt-manager'
  ]),
  tools: Object.freeze(Object.keys(TOOL_KEYS))
});

export function createAndroidAdapterRegistry(adapters = [ANDROID_TERMUX_ADAPTER]) {
  const entries = new Map();
  for (const adapter of adapters) {
    if (!adapter || typeof adapter !== 'object') throw new TypeError('adapter must be an object');
    const id = requiredText(adapter.id, 'adapter.id');
    if (entries.has(id)) throw new Error(`duplicate adapter id: ${id}`);
    entries.set(id, Object.freeze({
      ...adapter,
      operations: Object.freeze([...(adapter.operations ?? [])]),
      tools: Object.freeze([...(adapter.tools ?? [])])
    }));
  }
  return Object.freeze({
    list: () => [...entries.values()],
    get: id => entries.get(id) ?? null
  });
}

export function validateAndroidRequest(request, policy) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('request object required');
  if (!policy || !Array.isArray(policy.workspaceRoots) || policy.workspaceRoots.length === 0) {
    throw new TypeError('policy must declare approved workspace roots');
  }
  const operation = requiredText(request.operation, 'operation');
  if (!READ_ONLY.has(operation) && !APPROVED_WRITE.has(operation)) throw new Error('operation is not allowlisted');
  const roots = policy.workspaceRoots;
  const args = [];
  let executable;
  let resource = null;
  let requiredEnvironment = [];

  if (operation === 'inspect-apk') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    executable = tool(policy, 'apkanalyzer');
    args.push('apk', 'summary', inputPath);
    resource = inputPath;
  } else if (operation === 'inspect-manifest') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    executable = tool(policy, 'apkanalyzer');
    args.push('manifest', 'print', inputPath);
    resource = inputPath;
  } else if (operation === 'inspect-dex') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    executable = tool(policy, 'apkanalyzer');
    args.push('dex', 'list', inputPath);
    resource = inputPath;
  } else if (operation === 'dump-badging') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    executable = tool(policy, 'aapt');
    args.push('dump', 'badging', inputPath);
    resource = inputPath;
  } else if (operation === 'verify-alignment') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    executable = tool(policy, 'zipalign');
    args.push('-c', '-v', '4', inputPath);
    resource = inputPath;
  } else if (operation === 'verify-signature') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    executable = tool(policy, 'apksigner');
    args.push('verify', '--verbose', '--print-certs', inputPath);
    resource = inputPath;
  } else if (operation === 'list-packages') {
    executable = tool(policy, 'pm');
    args.push('list', 'packages');
    resource = 'android:installed-packages';
  } else if (operation === 'probe-tool') {
    const key = requiredText(request.toolKey, 'toolKey');
    if (!Object.hasOwn(TOOL_KEYS, key)) throw new Error('tool key is not allowlisted');
    executable = tool(policy, 'which');
    args.push(TOOL_KEYS[key]);
    resource = `tool:${key}`;
  } else if (operation === 'decompile-apk') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    const outputPath = absoluteWorkspacePath(request.outputPath, 'outputPath', roots);
    if (inputPath === outputPath) throw new Error('input and output paths must differ');
    resource = artifactResource(request, inputPath, outputPath);
    executable = tool(policy, 'apktool');
    args.push('d', '-f', '-o', outputPath, inputPath);
  } else if (operation === 'rebuild-apk') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    const outputPath = absoluteWorkspacePath(request.outputPath, 'outputPath', roots);
    if (inputPath === outputPath) throw new Error('input and output paths must differ');
    resource = artifactResource(request, inputPath, outputPath);
    executable = tool(policy, 'apktool');
    args.push('b', inputPath, '-o', outputPath);
  } else if (operation === 'align-apk') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    const outputPath = absoluteWorkspacePath(request.outputPath, 'outputPath', roots);
    if (inputPath === outputPath) throw new Error('input and output paths must differ');
    resource = artifactResource(request, inputPath, outputPath);
    executable = tool(policy, 'zipalign');
    args.push('-p', '-f', '4', inputPath, outputPath);
  } else if (operation === 'sign-apk') {
    const inputPath = absoluteWorkspacePath(request.inputPath, 'inputPath', roots);
    const outputPath = absoluteWorkspacePath(request.outputPath, 'outputPath', roots);
    const keystorePath = absoluteWorkspacePath(request.keystorePath, 'keystorePath', roots);
    if (new Set([inputPath, outputPath, keystorePath]).size !== 3) throw new Error('input, output and keystore paths must be distinct');
    const alias = requiredText(request.keyAlias, 'keyAlias');
    if (!ALIAS.test(alias)) throw new TypeError('keyAlias contains unsupported characters');
    resource = artifactResource(request, inputPath, outputPath, { keystorePath, keyAlias: alias });
    executable = tool(policy, 'apksigner');
    args.push('sign', '--ks', keystorePath, '--ks-key-alias', alias,
      '--ks-pass', 'env:SG_ANDROID_KEYSTORE_PASSWORD',
      '--key-pass', 'env:SG_ANDROID_KEY_PASSWORD', '--out', outputPath, inputPath);
    requiredEnvironment = ['SG_ANDROID_KEYSTORE_PASSWORD', 'SG_ANDROID_KEY_PASSWORD'];
  } else if (operation === 'launch-mt-manager') {
    const packageId = requiredText(request.packageId, 'packageId');
    if (!PACKAGE_ID.test(packageId) || request.discoveredPackageId !== packageId) {
      throw new TypeError('package id must match the explicitly discovered installed package id');
    }
    resource = `android:package:${packageId}`;
    executable = tool(policy, 'monkey');
    args.push('-p', packageId, '-c', 'android.intent.category.LAUNCHER', '1');
  }

	let authorization = null;
  if (APPROVED_WRITE.has(operation)) {
    requiredText(request.taskId, 'taskId');
    authorization = requireApproval(request, operation, resource);
  }

  return Object.freeze({
    adapterId: 'android-termux', platform: 'android', operation, executable,
    args: Object.freeze(args), shell: false, requiresApproval: APPROVED_WRITE.has(operation),
    resource, authorization, requiredEnvironment: Object.freeze(requiredEnvironment)
  });
}

export function buildAndroidInvocation(request, policy) {
  return validateAndroidRequest(request, policy);
}
