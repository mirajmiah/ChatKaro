import nodemailer from 'nodemailer';

const getTransporter = () => {
  // Trim accidental whitespace from dashboard/environment values.
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
    throw new Error(`Gmail SMTP is not configured. Missing environment variable(s): ${missing.join(', ')}. Set them in Render → Environment.`);
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secureSetting = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  return nodemailer.createTransport({
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port,
    secure: secureSetting ? secureSetting === 'true' : port === 465,
    auth: { user, pass: password },
  });
};

export const sendOtpEmail = async (email, otp, purpose) => {
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

  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const from = (process.env.SMTP_FROM || '').trim() || `ChatKaro <${smtpUser}>`;
  await getTransporter().sendMail({
    from,
    to: email,
    subject: message.subject,
    text: `${message.intro} ${otp}\nThis code expires in 10 minutes.`,
    html: `<p>${message.intro}</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes.</p>`,
  });
};
