import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import { z } from 'zod';
import { createOpaqueToken, hashToken, issueSessionToken, verifySessionToken, safeEqual, createCsrfToken } from './security.js';
import { createMailer } from './mailer.js';

const { Pool } = pg;
const env = process.env;
for (const key of ['DATABASE_URL','BASE_URL','JWT_SECRET','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','MAIL_FROM']) {
  if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (Buffer.byteLength(env.JWT_SECRET) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
const baseUrl = new URL(env.BASE_URL);
if (env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') throw new Error('BASE_URL must use HTTPS in production');
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined });
const mailer = createMailer(env);
const app = express();
const isProduction = env.NODE_ENV === 'production';
const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 };
const csrfCookieOptions = { httpOnly: false, secure: isProduction, sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000 };
const allowedOrigins = (env.CORS_ORIGINS || baseUrl.origin).split(',').map(x => x.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"] } } }));
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); cb(new Error('origin_not_allowed')); },
  credentials: true, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','X-CSRF-Token','X-SG-Admin-Token'] }));
app.use(express.json({ limit: '16kb', strict: true }));
app.use(cookieParser());
const authLimiter = rateLimit({ windowMs: 15*60*1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
app.use(['/api/register','/api/login','/api/verify-email','/api/forgot-password','/api/reset-password','/api/resend-verification'], authLimiter);

const emailSchema = z.string().trim().email().max(254).transform(v => v.toLowerCase());
const passwordSchema = z.string().min(12).max(128);
const registrationSchema = z.object({ email: emailSchema, password: passwordSchema, displayName: z.string().trim().min(1).max(100).optional() }).strict();
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
const tokenSchema = z.string().min(40).max(512);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function publicError(res, status, error) { return res.status(status).json({ error }); }
function requireAdmin(req, res, next) {
  const expected = env.SG_EMAIL_ADMIN_TOKEN;
  const supplied = req.get('x-sg-admin-token') || '';
  if (!expected || Buffer.byteLength(expected) < 32) return res.status(503).json({ error: 'admin_api_not_configured' });
  if (!safeEqual(supplied, expected)) return res.status(401).json({ error: 'admin_authentication_required' });
  next();
}
function csrfValid(req) {
  const cookie = req.cookies.sg_csrf;
  const header = req.get('x-csrf-token');
  return Boolean(req.auth && cookie && header && safeEqual(cookie, header) &&
    safeEqual(cookie, createCsrfToken(req.auth.jti, env.JWT_SECRET)));
}
function requireCsrf(req, res, next) {
  if (!csrfValid(req)) return res.status(403).json({ error: 'csrf_validation_failed' });
  next();
}
async function authenticate(req, res, next) {
  const token = req.cookies.sg_session;
  if (!token) return publicError(res,401,'authentication_required');
  try {
    const payload = verifySessionToken(token, env.JWT_SECRET);
    const session = await pool.query(`SELECT s.id, s.user_id FROM auth_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.jti=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.is_verified=true AND u.status='active'`, [payload.jti, payload.sub]);
    if (!session.rowCount) return publicError(res,401,'session_revoked_or_inactive');
    req.auth = { userId: payload.sub, email: payload.email, jti: payload.jti };
    next();
  } catch { return publicError(res,401,'invalid_or_expired_session'); }
}
async function audit(userId, eventType, outcome, requestId = null) {
  await pool.query('INSERT INTO auth_audit_events(user_id,event_type,outcome,request_id) VALUES($1,$2,$3,$4)',
    [userId,eventType,outcome,requestId]).catch(() => {});
}
async function createActionToken(userId, purpose, ttlHours) {
  const raw = createOpaqueToken();
  await pool.query(`INSERT INTO auth_action_tokens(user_id,purpose,token_hash,expires_at)
    VALUES($1,$2,$3,now()+($4 * interval '1 hour'))`, [userId,purpose,hashToken(raw),ttlHours]);
  return raw;
}
async function sendActionMail(user, purpose) {
  const token = await createActionToken(user.id, purpose, purpose === 'verify_email' ? 24 : 0.5);
  const route = purpose === 'verify_email' ? '/verify-email.html' : '/reset-password.html';
  const url = new URL(route, env.BASE_URL); url.searchParams.set('token', token);
  if (purpose === 'verify_email') await mailer.sendVerification(user.email, url.toString());
  else await mailer.sendPasswordReset(user.email, url.toString());
}

app.get('/api/admin/status', requireAdmin, async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ service:'sg-email-server', database:'reachable', smtp:'configured_not_tested', outboundEmailEnabled:false, productionDeployment:false }); }
  catch { res.status(503).json({ service:'sg-email-server', database:'unavailable' }); }
});
app.get('/api/admin/metrics', requireAdmin, async (_req,res) => {
  try {
    const q = await pool.query(`SELECT count(*) FILTER (WHERE is_verified=false AND status='pending_verification')::int AS pending_verification,
      count(*) FILTER (WHERE is_verified=true AND status='active')::int AS active_verified,
      count(*) FILTER (WHERE status='suspended')::int AS suspended FROM users`);
    const events = await pool.query('SELECT count(*)::int AS total_events FROM auth_audit_events');
    res.json({ registrations:q.rows[0], audit:events.rows[0] });
  } catch { res.status(503).json({ error:'metrics_unavailable' }); }
});
app.get('/health', async (_req,res) => {
  try { await pool.query('SELECT 1'); res.json({ status:'ok', database:'reachable', mode:'email-auth' }); }
  catch { res.status(503).json({ status:'degraded' }); }
});

app.post('/api/register', async (req,res) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) return publicError(res,400,'invalid_registration_payload');
  const { email,password,displayName } = parsed.data;
  const client = await pool.connect();
  let user;
  try {
    await client.query('BEGIN');
    const inserted = await client.query(`INSERT INTO users(email,password_hash,display_name,status,is_verified)
      VALUES($1,$2,$3,'pending_verification',false) ON CONFLICT(email) DO NOTHING RETURNING id,email`,
      [email,await bcrypt.hash(password,12),displayName || null]);
    if (!inserted.rowCount) { await client.query('ROLLBACK'); return res.status(202).json({message:'if_registration_is_available_check_your_email'}); }
    user = inserted.rows[0];
    await client.query('COMMIT');
  } catch { await client.query('ROLLBACK'); return publicError(res,500,'registration_unavailable'); }
  finally { client.release(); }
  await audit(user.id,'registration.created','pending');
  try { await sendActionMail(user,'verify_email'); }
  catch { await audit(user.id,'verification_email.delivery','failure'); return res.status(202).json({message:'registration_received_if_eligible_check_your_email'}); }
  return res.status(201).json({message:'registration_created_check_email'});
});

app.post('/api/verify-email', async (req,res) => {
  const parsed = tokenSchema.safeParse(req.body?.token);
  if (!parsed.success) return publicError(res,400,'invalid_or_expired_token');
  const result = await pool.query(`WITH consumed AS (
    UPDATE auth_action_tokens SET consumed_at=now()
    WHERE token_hash=$1 AND purpose='verify_email' AND consumed_at IS NULL AND expires_at>now()
    RETURNING user_id
  ) UPDATE users SET is_verified=true,status='active',verified_at=now()
    WHERE id IN (SELECT user_id FROM consumed) RETURNING id`,[hashToken(parsed.data)]);
  if (!result.rowCount) return publicError(res,400,'invalid_or_expired_token');
  await audit(result.rows[0].id,'email.verified','success');
  res.json({message:'email_verified'});
});

app.post('/api/resend-verification', async (req,res) => {
  const parsed = z.object({email:emailSchema}).safeParse(req.body);
  if (!parsed.success) return publicError(res,400,'invalid_request');
  const found = await pool.query("SELECT id,email FROM users WHERE email=$1 AND is_verified=false AND status='pending_verification'",[parsed.data.email]);
  if (found.rowCount) { try { await sendActionMail(found.rows[0],'verify_email'); } catch { await audit(found.rows[0].id,'verification_email.delivery','failure'); } }
  res.json({message:'if_account_requires_verification_email_will_be_sent'});
});

app.post('/api/login', async (req,res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return publicError(res,400,'invalid_login_payload');
  const {email,password}=parsed.data;
  const found = await pool.query("SELECT id,email,password_hash,is_verified,status FROM users WHERE email=$1",[email]);
  const user = found.rows[0];
  const dummyHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5JQ5qW8iM7x9lZ2Y8nY8L2Vf9L6u9eK';
  const matched = await bcrypt.compare(password,user?.password_hash || dummyHash);
  if (!user || !matched) { await audit(user?.id || null,'auth.login','failure'); return publicError(res,401,'invalid_email_or_password'); }
  if (!user.is_verified || user.status!=='active') return publicError(res,403,'email_verification_required');
  const jti = crypto.randomUUID();
  const token = issueSessionToken({userId:user.id,email:user.email,secret:env.JWT_SECRET,jti});
  await pool.query("INSERT INTO auth_sessions(jti,user_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",[jti,user.id]);
  res.cookie('sg_session',token,cookieOptions);
  res.cookie('sg_csrf',createCsrfToken(jti,env.JWT_SECRET),csrfCookieOptions);
  await audit(user.id,'auth.login','success');
  res.json({message:'login_successful'});
});

app.get('/api/me', authenticate, async (req,res) => {
  const result = await pool.query("SELECT id,email,display_name,created_at FROM users WHERE id=$1 AND is_verified=true AND status='active'",[req.auth.userId]);
  if (!result.rowCount) return publicError(res,401,'authentication_required');
  res.json({user:result.rows[0]});
});

app.post('/api/logout', authenticate, requireCsrf, async (req,res) => {
  await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE jti=$1 AND revoked_at IS NULL',[req.auth.jti]);
  await audit(req.auth.userId,'auth.logout','success');
  res.clearCookie('sg_session',{...cookieOptions,maxAge:undefined});
  res.clearCookie('sg_csrf',{...csrfCookieOptions,maxAge:undefined});
  res.json({message:'logged_out'});
});

app.post('/api/forgot-password', async (req,res) => {
  const parsed = z.object({email:emailSchema}).safeParse(req.body);
  if (!parsed.success) return publicError(res,400,'invalid_request');
  const found = await pool.query("SELECT id,email FROM users WHERE email=$1 AND is_verified=true AND status='active'",[parsed.data.email]);
  if (found.rowCount) { try { await sendActionMail(found.rows[0],'reset_password'); } catch { await audit(found.rows[0].id,'password_reset_email.delivery','failure'); } }
  res.json({message:'if_account_exists_reset_email_will_be_sent'});
});

app.post('/api/reset-password', async (req,res) => {
  const parsed = z.object({token:tokenSchema,password:passwordSchema}).safeParse(req.body);
  if (!parsed.success) return publicError(res,400,'invalid_reset_request');
  const digest = hashToken(parsed.data.token);
  const passwordHash = await bcrypt.hash(parsed.data.password,12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const consumed = await client.query(`UPDATE auth_action_tokens SET consumed_at=now()
      WHERE token_hash=$1 AND purpose='reset_password' AND consumed_at IS NULL AND expires_at>now() RETURNING user_id`,[digest]);
    if (!consumed.rowCount) { await client.query('ROLLBACK'); return publicError(res,400,'invalid_or_expired_token'); }
    await client.query("UPDATE users SET password_hash=$1,password_changed_at=now() WHERE id=$2",[passwordHash,consumed.rows[0].user_id]);
    await client.query('UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[consumed.rows[0].user_id]);
    await client.query("INSERT INTO auth_audit_events(user_id,event_type,outcome) VALUES($1,'auth.password_reset','success')",[consumed.rows[0].user_id]);
    await client.query('COMMIT');
    res.json({message:'password_reset_successful'});
  } catch { await client.query('ROLLBACK'); return publicError(res,500,'password_reset_unavailable'); }
  finally { client.release(); }
});

// Gate dashboard HTML before static middleware; the static handler must never serve it directly.
app.get('/dashboard.html', authenticate, (_req,res) => res.sendFile(path.resolve(__dirname,'../public/dashboard.html')));
app.use(express.static(path.resolve(__dirname,'../public'),{index:false,dotfiles:'deny'}));
app.get('/',(_req,res)=>res.sendFile(path.resolve(__dirname,'../public/index.html')));
app.use((_error,_req,res,_next)=>res.status(500).json({error:'internal_server_error'}));

const port = Number(env.PORT || 3000);
if (env.NODE_ENV !== 'test') app.listen(port,'127.0.0.1',()=>console.log(`SG email auth listening on 127.0.0.1:${port}`));
export { app, pool };
