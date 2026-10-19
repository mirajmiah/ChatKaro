import 'dotenv/config';
import { sendOtpEmail } from '../src/lib/email.js';

async function main() {
  const recipient = process.argv[2] || 'mirajmiah322173@gmail.com';
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();

  console.log('\n--- ChatKaro Email Delivery Test ---');
  console.log(`Provider : Google Gmail API (HTTPS Port 443)`);
  console.log(`Sender   : ${user}`);
  console.log(`Recipient: ${recipient}`);
  console.log('-------------------------------------\n');

  if (!process.env.GMAIL_REFRESH_TOKEN?.trim()) {
    console.error('ERROR: GMAIL_REFRESH_TOKEN is missing in .env!');
    console.error('Run: npm run get:gmail-token to generate it.\n');
    process.exit(1);
  }

  console.log(`Sending test verification email to ${recipient}...`);
  try {
    await sendOtpEmail(recipient, '889900', 'signup');
    console.log(`\n✓ Success! Test verification email sent to ${recipient}!`);
    console.log('Google Gmail API is working properly.\n');
  } catch (err) {
    console.error('\n✗ Failed to send email:');
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
