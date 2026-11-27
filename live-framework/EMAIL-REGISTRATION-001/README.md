# SG-EMAIL-SERVER-001 — Email registration and authentication

Status: isolated implementation draft; not deployed and not connected to a live SMTP provider or database.

## Scope
Express + PostgreSQL + Nodemailer SMTP + bcrypt + JWT in HTTP-only cookies. Includes registration, email verification, login, protected profile/dashboard, logout with server-side session revocation, verification resend and password reset. A private MCP plugin provides read-only status and aggregate metrics.

## Local setup
1. Create a disposable PostgreSQL database and apply `db/001_auth.sql`.
2. Copy `.env.example` to `.env`; fill local-only values. Do not commit `.env`.
3. `npm install`
4. `npm test` and `npm run check`
5. `npm start`

The server binds to loopback by default. Production requires HTTPS, trusted reverse-proxy configuration, secret-manager injection, SMTP provider approval, DNS authentication, backups, retention/privacy review and separate deployment approval.

## Security
- Action tokens are 256-bit random values; only SHA-256 digests are stored. Tokens are single-use and expire.
- JWT access sessions expire after 15 minutes and are checked against revocable server-side session records.
- Cookies are HttpOnly, SameSite=Strict and Secure in production. State-changing authenticated requests require a CSRF token bound to the session.
- Dashboard HTML is server-gated; it is not exposed as a public static file.
- Registration/login/password flows are rate-limited; login responses avoid account enumeration.
- Password reset revokes all active sessions.
- Admin API exposes aggregate counts only and requires a separate 32-byte token.
- Audit table exists and records login/logout/password-reset events. Full audit coverage, durable mail queue/retries and retention controls remain release blockers.

## Explicit non-goals
No mailbox provisioning, DNS edits, email sending, production user creation, cloud resource provisioning, or deployment is performed by this source package.
