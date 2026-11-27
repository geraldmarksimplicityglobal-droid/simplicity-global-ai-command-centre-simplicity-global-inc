import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpaqueToken, hashToken, issueSessionToken, verifySessionToken, safeEqual, createCsrfToken } from '../src/security.js';

test('opaque verification tokens have high entropy and URL-safe encoding', () => {
  const token = createOpaqueToken();
  assert.match(token,/^[A-Za-z0-9_-]+$/);
  assert.ok(Buffer.from(token,'base64url').length >= 32);
});
test('token hashes are deterministic and do not expose the raw token', () => {
  const token=createOpaqueToken(); const digest=hashToken(token);
  assert.equal(digest,hashToken(token)); assert.notEqual(digest,token); assert.match(digest,/^[a-f0-9]{64}$/);
});
test('JWT session is bound to issuer, audience and subject and expires after 15 minutes', () => {
  const secret='x'.repeat(48); const now=Date.now();
  const token=issueSessionToken({userId:'user-123',email:'person@example.com',secret,jti:'session-1',now});
  const payload=verifySessionToken(token,secret,now);
  assert.equal(payload.sub,'user-123'); assert.equal(payload.aud,'sg-registration');
  assert.equal(payload.iss,'https://simplicityglobal.com'); assert.equal(payload.exp-payload.iat,900);
  assert.throws(()=>verifySessionToken(token,secret,now+901000),/invalid claims/);
});
test('JWT signing rejects weak secrets', () => {
  assert.throws(()=>issueSessionToken({userId:1,email:'x@y.test',secret:'weak',jti:'j'}),/32 bytes/);
});
test('constant-time comparison rejects unequal values', () => {
  assert.equal(safeEqual('same','same'),true); assert.equal(safeEqual('same','different'),false);
});
test('CSRF token is bound to the server-side session identifier', () => {
  const secret='s'.repeat(48); const token=createCsrfToken('session-a',secret);
  assert.equal(safeEqual(token,createCsrfToken('session-a',secret)),true);
  assert.equal(safeEqual(token,createCsrfToken('session-b',secret)),false);
});
