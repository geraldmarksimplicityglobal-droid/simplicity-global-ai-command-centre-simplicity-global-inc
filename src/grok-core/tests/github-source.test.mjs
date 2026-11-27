import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRepository, isSourcePath } from '../src/providers/github-source.mjs';

test('validates repository identity', () => {
 assert.deepEqual(validateRepository({owner:'octo',repo:'demo',ref:'main'}), {owner:'octo',repo:'demo',ref:'main'});
 assert.throws(() => validateRepository({owner:'../bad',repo:'demo',ref:'main'}));
});
test('allows source code but excludes generated and dependency paths', () => {
 assert.equal(isSourcePath('src/index.ts'), true);
 assert.equal(isSourcePath('node_modules/pkg/index.js'), false);
 assert.equal(isSourcePath('dist/bundle.js'), false);
 assert.equal(isSourcePath('README.md'), false);
});
