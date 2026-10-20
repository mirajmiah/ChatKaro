import { OAuth2Client } from 'google-auth-library';

const buildMessage = (otp, purpose) => {
  const messages = {
    signup: {
      subject: 'Verify your ChatKaro email',
      intro: 'Use this code to verify your ChatKaro account:',
    },
    login: {
      subject: 'ChatKaro sign-in verification code',
      intro: 'Use this code to sign in to your ChatKaro account:',
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
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const clientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim();

  const missing = [];
  if (!user) missing.push('GMAIL_USER (or SMTP_USER)');
  if (!clientId) missing.push('GMAIL_CLIENT_ID (or GOOGLE_CLIENT_ID)');
  if (!clientSecret) missing.push('GMAIL_CLIENT_SECRET');
  if (!refreshToken) missing.push('GMAIL_REFRESH_TOKEN');
  if (missing.length) {
    throw new Error(`Gmail API is not configured. Missing: ${missing.join(', ')}.`);
  }

  const oauthClient = new OAuth2Client(clientId, clientSecret);
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const tokenResult = await oauthClient.getAccessToken();
  const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
  if (!accessToken) throw new Error('Google did not provide an access token for Gmail API.');

  const boundary = `chatkaro_${Date.now().toString(36)}`;
  const from = (process.env.SMTP_FROM || `ChatKaro <${user}>`).trim();
  const mime = [
    `From: ${from}`,
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

const sendWithBrevo = async ({ to, subject, text, html }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.SMTP_USER || process.env.BREVO_SENDER_EMAIL || '').trim();
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured.');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'ChatKaro', email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result.message || `HTTP ${response.status}`;
    throw new Error(`Brevo email API failed: ${detail}`);
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
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.message === 'string' ? result.message : `HTTP ${response.status}`;
    throw new Error(`Resend email API failed: ${detail}`);
  }
  return result;
};

export const sendOtpEmail = async (email, otp, purpose) => {
  const message = buildMessage(otp, purpose);
  const payload = { to: email, ...message };

  // 1. Google's official Gmail API over HTTPS (Port 443)
  // Sends from your real Gmail account (GMAIL_USER) and is never blocked by cloud firewalls.
  if (process.env.GMAIL_REFRESH_TOKEN?.trim()) {
    await sendWithGmailApi(payload);
    return;
  }

  // 2. Alternative HTTPS APIs (Port 443)
  if (process.env.BREVO_API_KEY?.trim()) {
    await sendWithBrevo(payload);
    return;
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendWithResend(payload);
    return;
  }

  throw new Error('Email service is not configured. Set GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_USER in .env.');
};
