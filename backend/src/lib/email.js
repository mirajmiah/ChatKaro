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

const sendWithBrevo = async ({ to, subject, text, html }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || 'ChatKaro').trim();

  if (!apiKey) throw new Error('BREVO_API_KEY is not configured.');
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is not configured. Add a verified sender email in Brevo.');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.message === 'string' ? result.message : `HTTP ${response.status}`;
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
    body: JSON.stringify({ from, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Do not include API keys or message contents in logs.
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
    throw new Error(`Email is not configured. Set RESEND_API_KEY (recommended for Render Free) or SMTP_USER and SMTP_PASS. Missing: ${missing.join(', ')}.`);
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

  // Render Free blocks outbound SMTP ports. Prefer an HTTPS email API there.
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendWithResend(payload);
    return;
  }
  await sendWithSmtp(payload);
};
