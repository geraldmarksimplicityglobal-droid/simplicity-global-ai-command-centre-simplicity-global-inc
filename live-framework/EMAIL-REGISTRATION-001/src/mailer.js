import nodemailer from 'nodemailer';

export function createMailer(env = process.env) {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
  for (const key of required) if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
  const port = Number(env.SMTP_PORT);
  if (![465, 587].includes(port)) throw new Error('SMTP_PORT must be 465 or 587');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure: port === 465, requireTLS: port === 587,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    tls: { minVersion: 'TLSv1.2' }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000
  });
  return Object.freeze({
    async sendVerification(to, url) {
      return transport.sendMail({ from: env.MAIL_FROM, to, subject: 'Verify your Simplicity Global email',
        text: `Verify your email using this link (expires in 24 hours): ${url}`,
        html: `<p>Verify your email address. This link expires in 24 hours.</p><p><a href="${url}">Verify email</a></p>` });
    },
    async sendPasswordReset(to, url) {
      return transport.sendMail({ from: env.MAIL_FROM, to, subject: 'Reset your Simplicity Global password',
        text: `Reset your password using this link (expires in 30 minutes): ${url}`,
        html: `<p>A password reset was requested. This link expires in 30 minutes.</p><p><a href="${url}">Reset password</a></p>` });
    },
    verify: () => transport.verify()
  });
}
