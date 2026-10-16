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

const sendWithSmtp = async ({ to, subject, text, html }) => {
  const user = (process.env.SMTP_USER || '').trim();
  const password = (process.env.SMTP_PASS || '').replace(/\s/g, '');
  const missing = [];
  if (!user) missing.push('SMTP_USER');
  if (!password) missing.push('SMTP_PASS');
  if (missing.length) {
    throw new Error(`Gmail SMTP is not configured. Set the following Render environment variable(s): ${missing.join(', ')}. Use a Google App Password, not your normal Gmail password.`);
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secureSetting = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const transporter = nodemailer.createTransport({
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port,
    secure: secureSetting ? secureSetting === 'true' : port === 465,
    auth: { user, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  const from = (process.env.SMTP_FROM || '').trim() || `ChatKaro <${user}>`;
  try {
    await transporter.sendMail({ from, to, subject, text, html });
  } catch (error) {
    // Keep credentials and recipient details out of application logs.
    if (error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET' || error?.code === 'ECONNECTION') {
      throw new Error('Gmail SMTP connection failed or timed out. Check the SMTP settings and whether your hosting provider allows outbound SMTP connections.');
    }
    if (error?.responseCode === 535 || error?.code === 'EAUTH') {
      throw new Error('Gmail SMTP authentication failed. Check SMTP_USER and create a fresh Google App Password for SMTP_PASS.');
    }
    throw new Error('Gmail SMTP could not send the email. Check the SMTP configuration and server logs.');
  }
};

export const sendOtpEmail = async (email, otp, purpose) => {
  const message = buildMessage(otp, purpose);
  await sendWithSmtp({ to: email, ...message });
};
