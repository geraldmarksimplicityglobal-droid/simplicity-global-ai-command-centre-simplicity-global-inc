import { validateArtifactRequest } from "./artifact-policy.mjs";
import { validateApproval } from "./approval-policy.mjs";
const SIGNING_POLICY = Object.freeze({ protectedOperations: ["sign"] });
function command(tool, args, purpose) {
  return Object.freeze({ tool, args: Object.freeze(args), purpose });
}
/** Build a reviewable command plan. This module never spawns processes or reads key material. */
export function buildSigningPlan(request) {
  const artifact = validateArtifactRequest(request);
  validateApproval({ taskId: request.taskId, target: artifact.outputPath, operation: "sign", approval: request.approval }, SIGNING_POLICY);
  const input = artifact.inputPath;
  const output = artifact.outputPath;
  const commands = artifact.type === "apk"
    ? [
        command("zipalign", ["-v", "-p", "4", input, output + ".aligned"], "Align APK before signing"),
        command("apksigner", ["sign", "--ks", "<secret-store:android.upload-keystore>", "--ks-key-alias", "<secret-store:android.upload-alias>", "--out", output, output + ".aligned"], "Sign APK without exposing passwords in arguments"),
        command("apksigner", ["verify", "--verbose", output], "Verify APK signature"),
        command("zipalign", ["-c", "-v", "4", output], "Verify APK alignment")
      ]
    : [
        command("jarsigner", ["-keystore", "<secret-store:android.upload-keystore>", "-signedjar", output, input, "<secret-store:android.upload-alias>"], "Sign AAB with upload key"),
        command("jarsigner", ["-verify", "-verbose", "-certs", output], "Verify AAB signature")
      ];
  return Object.freeze({ planId: "SG-ANDROID-SIGN-PLAN-001", artifactType: artifact.type, inputPath: input, outputPath: output, execution: "not-executed", approvalRequired: true, commands: Object.freeze(commands) });
}
