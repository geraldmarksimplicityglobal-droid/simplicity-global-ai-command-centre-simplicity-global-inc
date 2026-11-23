import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectSigningEnvironment,
  assertReleaseSigningAllowed,
  buildApksignerArgs,
  redactSigningEnvironment,
} from '../release-policy.mjs';

const completeEnv = {
  SG_ANDROID_KEYSTORE_PATH: '/secure/keys/sg-release.jks',
  SG_ANDROID_KEYSTORE_PASSWORD: 'not-a-real-secret',
  SG_ANDROID_KEY_ALIAS: 'sg-release',
  SG_ANDROID_KEY_PASSWORD: 'not-a-real-secret-either',
};

test('reports missing release-signing variables without exposing values', () => {
  const result = inspectSigningEnvironment({ SG_ANDROID_KEY_ALIAS: 'alias' });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, [
    'SG_ANDROID_KEYSTORE_PATH',
    'SG_ANDROID_KEYSTORE_PASSWORD',
    'SG_ANDROID_KEY_PASSWORD',
  ]);
  assert.equal(JSON.stringify(result).includes('alias'), false);
});

test('reports a complete signing environment without returning secrets', () => {
  const result = inspectSigningEnvironment(completeEnv);
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
  assert.equal(JSON.stringify(result).includes('not-a-real-secret'), false);
});

test('blocks debug variant signing through the release workflow', () => {
  assert.throws(() => assertReleaseSigningAllowed({
    variant: 'debug', signingReady: true, operatorApproval: true,
    artifactIsProjectBuild: true,
  }), /release variant/i);
});

test('blocks signing without explicit per-release approval', () => {
  assert.throws(() => assertReleaseSigningAllowed({
    variant: 'release', signingReady: true, operatorApproval: false,
    artifactIsProjectBuild: true,
  }), /explicit approval/i);
});

test('blocks signing arbitrary third-party APKs', () => {
  assert.throws(() => assertReleaseSigningAllowed({
    variant: 'release', signingReady: true, operatorApproval: true,
    artifactIsProjectBuild: false,
  }), /project build artifact/i);
});

test('allows only an approved project release with configured signing', () => {
  assert.equal(assertReleaseSigningAllowed({
    variant: 'release', signingReady: true, operatorApproval: true,
    artifactIsProjectBuild: true,
  }), true);
});

test('builds apksigner arguments without embedding key passwords', () => {
  const args = buildApksignerArgs({
    keystorePath: '/secure/keys/sg-release.jks',
    keyAlias: 'sg-release',
    inputPath: 'app-unsigned.apk',
    outputPath: 'app-release.apk',
  });
  assert.deepEqual(args, [
    'sign', '--ks', '/secure/keys/sg-release.jks',
    '--ks-key-alias', 'sg-release',
    '--ks-pass', 'env:SG_ANDROID_KEYSTORE_PASSWORD',
    '--key-pass', 'env:SG_ANDROID_KEY_PASSWORD',
    '--out', 'app-release.apk', 'app-unsigned.apk',
  ]);
  assert.equal(args.some(value => value.includes('not-a-real-secret')), false);
});

test('redacts signing environment values and reports presence only', () => {
  const result = redactSigningEnvironment(completeEnv);
  assert.equal(result.SG_ANDROID_KEYSTORE_PATH, 'present');
  assert.equal(result.SG_ANDROID_KEYSTORE_PASSWORD, 'present');
  assert.equal(JSON.stringify(result).includes('not-a-real-secret'), false);
});

test('rejects an in-place output path that would overwrite the unsigned artifact', () => {
  assert.throws(() => buildApksignerArgs({
    keystorePath: '/secure/keys/sg-release.jks',
    keyAlias: 'sg-release',
    inputPath: 'same.apk',
    outputPath: 'same.apk',
  }), /must not overwrite/i);
});
