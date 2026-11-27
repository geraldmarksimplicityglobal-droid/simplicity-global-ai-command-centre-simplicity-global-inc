import crypto from 'node:crypto';

const b64 = value => Buffer.from(value).toString('base64url');
const fromB64 = value => Buffer.from(value, 'base64url');

export function createOpaqueToken(bytes = 32) {
  if (!Number.isInteger(bytes) || bytes < 32 || bytes > 128) throw new TypeError('token entropy must be 32–128 bytes');
  return crypto.randomBytes(bytes).toString('base64url');
}
export function hashToken(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 512) throw new TypeError('invalid token');
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}
export function issueSessionToken({ userId, email, secret, jti, now = Date.now() }) {
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const issued = Math.floor(now / 1000);
  const payload = b64(JSON.stringify({ sub: String(userId), email, jti, iss: 'https://simplicityglobal.com', aud: 'sg-registration', iat: issued, exp: issued + 900 }));
  const input = `${header}.${payload}`;
  return `${input}.${crypto.createHmac('sha256', secret).update(input).digest('base64url')}`;
}
export function verifySessionToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 4096 || !secret || Buffer.byteLength(secret) < 32) throw new Error('invalid session');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid session');
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(fromB64(headerPart).toString('utf8'));
  if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('invalid algorithm');
  const expected = crypto.createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest();
  const actual = fromB64(signaturePart);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('invalid signature');
  const payload = JSON.parse(fromB64(payloadPart).toString('utf8'));
  if (payload.iss !== 'https://simplicityglobal.com' || payload.aud !== 'sg-registration' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string' || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(now / 1000)) throw new Error('invalid claims');
  return payload;
}
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
export function createCsrfToken(sessionId, secret) {
  if (typeof sessionId !== 'string' || !secret || Buffer.byteLength(secret) < 32) throw new Error('invalid CSRF context');
  return crypto.createHmac('sha256', secret).update(`csrf:${sessionId}`).digest('base64url');
}
