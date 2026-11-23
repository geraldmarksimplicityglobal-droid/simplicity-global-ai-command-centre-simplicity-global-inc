import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const skill = await readFile(new URL('../../skills/mt-manager-android-engineering/SKILL.md', import.meta.url), 'utf8');

test('skill declares authorised-use boundaries', () => {
  assert.match(skill, /applications you own or are explicitly authorised to assess/i);
  assert.match(skill, /Do not bypass/i);
});

test('skill requires private signing keys to stay out of source control', () => {
  assert.match(skill, /Never commit.*keystore|Never commit.*private signing key/i);
  assert.match(skill, /secret manager|secure secret store/i);
});

test('skill requires inspect, build, verify and approval stages', () => {
  for (const phrase of ['Inspect', 'Build', 'Verify', 'explicit approval']) {
    assert.ok(skill.toLowerCase().includes(phrase.toLowerCase()), `missing ${phrase}`);
  }
});
