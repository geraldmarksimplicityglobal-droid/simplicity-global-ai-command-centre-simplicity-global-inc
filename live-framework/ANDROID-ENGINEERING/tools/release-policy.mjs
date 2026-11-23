const REQUIRED_SIGNING_VARIABLES = Object.freeze([
  'SG_ANDROID_KEYSTORE_PATH',
  'SG_ANDROID_KEYSTORE_PASSWORD',
  'SG_ANDROID_KEY_ALIAS',
  'SG_ANDROID_KEY_PASSWORD',
]);

export function inspectSigningEnvironment(env = process.env) {
  const missing = REQUIRED_SIGNING_VARIABLES.filter((name) => {
    return typeof env[name] !== 'string' || env[name].trim().length === 0;
  });
  return Object.freeze({ ready: missing.length === 0, missing });
}

export function assertReleaseSigningAllowed({
  variant,
  signingReady,
  operatorApproval,
  artifactIsProjectBuild,
}) {
  if (String(variant).toLowerCase() !== 'release') {
    throw new Error('Signing workflow accepts the release variant only.');
  }
  if (operatorApproval !== true) {
    throw new Error('Explicit approval is required for each release signing operation.');
  }
  if (artifactIsProjectBuild !== true) {
    throw new Error('Only an authorised project build artifact may enter this signing workflow.');
  }
  if (signingReady !== true) {
    throw new Error('Release signing configuration is incomplete.');
  }
  return true;
}

export function buildApksignerArgs({ keystorePath, keyAlias, inputPath, outputPath }) {
  for (const [name, value] of Object.entries({ keystorePath, keyAlias, inputPath, outputPath })) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`${name} must be a non-empty string.`);
    }
  }
  if (inputPath === outputPath) {
    throw new Error('Signed output must not overwrite the unsigned input artifact.');
  }
  return [
    'sign', '--ks', keystorePath,
    '--ks-key-alias', keyAlias,
    '--ks-pass', 'env:SG_ANDROID_KEYSTORE_PASSWORD',
    '--key-pass', 'env:SG_ANDROID_KEY_PASSWORD',
    '--out', outputPath, inputPath,
  ];
}

export function redactSigningEnvironment(env = process.env) {
  return Object.freeze(Object.fromEntries(
    REQUIRED_SIGNING_VARIABLES.map((name) => [
      name,
      typeof env[name] === 'string' && env[name].length > 0 ? 'present' : 'missing',
    ]),
  ));
}
