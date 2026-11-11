/**
 * Custody metadata only. This module intentionally contains no key storage,
 * key generation, recovery, signing, or custody-provider implementation.
 */
export type CustodyMode = "self-custody" | "custodial";

export interface CustodyProfile {
  readonly mode: CustodyMode;
  readonly providerLabel?: string;
  readonly userControlsRecovery: boolean;
}

export function validateCustodyProfile(profile: CustodyProfile): string[] {
  const errors: string[] = [];
  if (profile.mode === "self-custody" && !profile.userControlsRecovery) {
    errors.push("Self-custody profile must identify user-controlled recovery.");
  }
  if (profile.mode === "custodial" && profile.userControlsRecovery) {
    errors.push("Custodial recovery must not be represented as user-held signing-key control.");
  }
  if (profile.mode === "custodial" && !profile.providerLabel?.trim()) {
    errors.push("Custodial profile requires a provider label.");
  }
  return errors;
}
