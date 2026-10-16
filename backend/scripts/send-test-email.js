import 'dotenv/config';
import nodemailer from 'nodemailer';

async function main() {
  const recipient = process.argv[2] || 'mask60m@gmail.com';
  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s/g, '');
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secureSetting = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureSetting ? secureSetting === 'true' : port === 465;
  const from = (process.env.SMTP_FROM || '').trim() || `ChatKaro <${user}>`;

  console.log('--- ChatKaro SMTP Test ---');
  console.log(`SMTP Host: ${host}`);
  console.log(`SMTP Port: ${port}`);
  console.log(`SMTP Secure: ${secure}`);
  console.log(`SMTP User: ${user}`);
  console.log(`SMTP Pass provided: ${Boolean(pass)} (length: ${pass.length})`);
  console.log(`Sender: ${from}`);
  console.log(`Recipient: ${recipient}`);
  console.log('--------------------------');

  if (!user || !pass) {
    console.error('ERROR: SMTP_USER or SMTP_PASS is missing in .env!');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  console.log('1. Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('   ✓ SMTP connection verified successfully!');
  } catch (verifyErr) {
    console.error('   ✗ SMTP verification failed:');
    if (verifyErr?.responseCode === 535 || verifyErr?.code === 'EAUTH') {
      console.error('\n[Gmail Authentication Failed - 535 Bad Credentials]');
      console.error('Possible causes:');
      console.error('1. You must use a 16-character Google App Password (not your regular Gmail password).');
      console.error('2. 2-Step Verification must be enabled on the Google Account: ' + user);
      console.error('3. Make sure the App Password was generated while logged in as ' + user);
      console.error('   (Visit: https://myaccount.google.com/apppasswords)');
      console.error('4. Check if Google needs to unlock access: https://accounts.google.com/DisplayUnlockCaptcha\n');
    } else {
      console.error(verifyErr);
    }
    process.exit(1);
  }

  console.log(`2. Sending test email to ${recipient}...`);
  const timestamp = new Date().toLocaleString();
  const mailOptions = {
    from,
    to: recipient,
    subject: 'ChatKaro - SMTP Configuration Test Mail',
    text: `Hello!\n\nThis is a test email sent from ChatKaro to confirm your SMTP configuration is working properly.\n\nTimestamp: ${timestamp}\nSent via: ${host}:${port}\nSender: ${from}\n\nEverything is set up and working!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 700;">ChatKaro</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Email Delivery Verification</p>
        </div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #166534; font-weight: 600; margin: 0; font-size: 15px;">✓ SMTP Configuration Successful!</p>
          <p style="color: #15803d; margin: 6px 0 0; font-size: 14px;">Your Gmail SMTP setup in ChatKaro is working and able to deliver emails.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: 600;">Recipient:</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">${recipient}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: 600;">SMTP Host:</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">${host}:${port}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: 600;">Sender:</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">${from}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Sent At:</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">${timestamp}</td>
          </tr>
        </table>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          This is an automated test message from your ChatKaro development environment.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('   ✓ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   Accepted recipients: ${JSON.stringify(info.accepted)}`);
  } catch (sendErr) {
    console.error('   ✗ Failed to send email:');
    console.error(sendErr);
    process.exit(1);
  }
}

main();
