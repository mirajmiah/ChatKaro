import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';

const buildMessage = (otp, purpose) => {
  const messages = {
    signup: {
      subject: 'Verify your ChatKaro email',
      intro: 'Use this code to verify your ChatKaro account:',
    },
    passwordReset: {
      subject: 'Reset your ChatKaro password',
      intro: 'Use this code to reset your ChatKaro password:',
    },
  };
  const message = messages[purpose];
  if (!message) throw new Error('Unsupported email verification purpose.');
  return {
    subject: message.subject,
    text: `${message.intro} ${otp}\nThis code expires in 10 minutes.`,
    html: `<p>${message.intro}</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes.</p>`,
  };
};

const sendWithGmailApi = async ({ to, subject, text, html }) => {
  const user = (process.env.GMAIL_USER || '').trim();
  const clientId = (process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim();
  const missing = [];
  if (!user) missing.push('GMAIL_USER');
  if (!clientId) missing.push('GMAIL_CLIENT_ID');
  if (!clientSecret) missing.push('GMAIL_CLIENT_SECRET');
  if (!refreshToken) missing.push('GMAIL_REFRESH_TOKEN');
  if (missing.length) {
    throw new Error(`Gmail API email is not configured. Missing Render environment variable(s): ${missing.join(', ')}.`);
  }

  const oauthClient = new OAuth2Client(clientId, clientSecret);
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const tokenResult = await oauthClient.getAccessToken();
  const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
  if (!accessToken) throw new Error('Google did not provide an access token for Gmail API.');

  const boundary = `chatkaro_${Date.now().toString(36)}`;
  const mime = [
    `From: ChatKaro <${user}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  const raw = Buffer.from(mime, 'utf8').toString('base64url');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.error?.message === 'string' ? result.error.message : `HTTP ${response.status}`;
    throw new Error(`Gmail API email failed: ${detail}`);
  }
  return result;
};

const sendWithResend = async ({ to, subject, text, html }) => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  const from = (process.env.RESEND_FROM || 'ChatKaro <onboarding@resend.dev>').trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.message === 'string' ? result.message : `HTTP ${response.status}`;
    throw new Error(`Resend email API failed: ${detail}`);
  }
  return result;
};

const sendWithSmtp = async ({ to, subject, text, html }) => {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const password = (
    process.env.SMTP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_APP_PASSWORD ||
    ''
  ).replace(/\s/g, '');

  const missing = [];
  if (!user) missing.push('SMTP_USER');
  if (!password) missing.push('SMTP_PASS');
  if (missing.length) {
    throw new Error(`Email is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_USER for Gmail API, or RESEND_API_KEY, or SMTP_USER and SMTP_PASS. Missing: ${missing.join(', ')}.`);
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secureSetting = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const transporter = nodemailer.createTransport({
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port,
    secure: secureSetting ? secureSetting === 'true' : port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const from = (process.env.SMTP_FROM || '').trim() || `ChatKaro <${user}>`;
  await transporter.sendMail({ from, to, subject, text, html });
};

export const sendOtpEmail = async (email, otp, purpose) => {
  const message = buildMessage(otp, purpose);
  const payload = { to: email, ...message };

  // Prefer Gmail API when its refresh token is configured. It uses HTTPS,
  // avoiding outbound SMTP connection timeouts on Render Free.
  if (process.env.GMAIL_REFRESH_TOKEN?.trim()) {
    await sendWithGmailApi(payload);
    return;
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendWithResend(payload);
    return;
  }
  await sendWithSmtp(payload);
};
