import { validateInvocation } from './runtime-policy.mjs';
import {
  ANDROID_TERMUX_ADAPTER,
  buildAndroidInvocation,
  createAndroidAdapterRegistry
} from '../../ANDROID-MT-MANAGER/src/android-policy.mjs';

export { ANDROID_TERMUX_ADAPTER };

export function createAgenticAndroidAdapter(adapters = [ANDROID_TERMUX_ADAPTER]) {
  const registry = createAndroidAdapterRegistry(adapters);
  return Object.freeze({
    list: () => registry.list(),
    get: id => registry.get(id)
  });
}

/**
 * Apply the Android-specific policy, then the shared GEN SYSTEM runtime policy.
 * This prepares a bounded invocation only; a trusted runner must execute it.
 */
export function buildAgenticAndroidInvocation(request, androidPolicy, runtimePolicy = {}) {
  const plan = buildAndroidInvocation(request, androidPolicy);
  const workingDirectory = request.workingDirectory ?? androidPolicy.workspaceRoots[0];
  const sharedPolicy = {
    ...runtimePolicy,
    adapters: [{ id: plan.adapterId, executable: plan.executable, operations: [plan.operation] }],
    workspaceRoots: androidPolicy.workspaceRoots,
    approvalRequiredOperations: [],
    maxTimeoutMs: runtimePolicy.maxTimeoutMs ?? 120000,
    maxOutputBytes: runtimePolicy.maxOutputBytes ?? 1048576
  };
  const bounded = validateInvocation({
    adapterId: plan.adapterId,
    operation: plan.operation,
    executable: plan.executable,
    args: plan.args,
    workingDirectory,
    timeoutMs: request.timeoutMs ?? 30000,
    maxOutputBytes: request.maxOutputBytes ?? 262144,
    environment: {}
  }, sharedPolicy);
  return Object.freeze({
    ...bounded,
    requiresApproval: plan.requiresApproval,
    resource: plan.resource,
    authorization: plan.authorization,
    requiredEnvironment: plan.requiredEnvironment
  });
}