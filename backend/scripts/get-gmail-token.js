import 'dotenv/config';
import http from 'http';
import readline from 'readline';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n======================================================');
  console.log('   ChatKaro - Google Gmail API Token Generator');
  console.log('======================================================\n');
  console.log('This tool will generate your GMAIL_REFRESH_TOKEN so');
  console.log('Render Free can send emails directly from your Gmail\naccount via Google HTTPS API (bypassing SMTP blocks).\n');

  let clientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
  let clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();

  if (!clientId) {
    clientId = (await ask('1. Enter your Google Client ID: ')).trim();
  } else {
    console.log(`1. Using Google Client ID: ${clientId}`);
  }

  if (!clientSecret) {
    clientSecret = (await ask('2. Enter your Google Client Secret: ')).trim();
  } else {
    console.log('2. Using Google Client Secret from environment.');
  }

  if (!clientId || !clientSecret) {
    console.error('\nERROR: Both Client ID and Client Secret are required.');
    rl.close();
    process.exit(1);
  }

  const PORT = 5002;
  const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

  const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (reqUrl.pathname === '/oauth2callback') {
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h2>Authorization Error: ${error}</h2>`);
          console.error(`\nGoogle Authorization Error: ${error}`);
          server.close();
          process.exit(1);
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1 style="color: #16a34a;">Success! Refresh Token Generated</h1>
                <p>You can close this tab and return to your terminal.</p>
              </body>
            </html>
          `);

          const { tokens } = await oauth2Client.getToken(code);
          const refreshToken = tokens.refresh_token;

          console.log('\n======================================================');
          console.log('              SUCCESSFULLY GENERATED!                 ');
          console.log('======================================================\n');
          console.log('Copy this GMAIL_REFRESH_TOKEN to your Render Environment:\n');
          console.log(`GMAIL_REFRESH_TOKEN=${refreshToken}\n`);
          console.log('And make sure you have:');
          console.log(`GMAIL_CLIENT_ID=${clientId}`);
          console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
          console.log(`GMAIL_USER=${process.env.SMTP_USER || 'your-gmail-address@gmail.com'}\n`);
          console.log('======================================================\n');

          // Append or update local .env
          if (fs.existsSync(envPath) && refreshToken) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (!envContent.includes('GMAIL_CLIENT_ID=')) {
              envContent += `\nGMAIL_CLIENT_ID=${clientId}`;
            }
            if (!envContent.includes('GMAIL_CLIENT_SECRET=')) {
              envContent += `\nGMAIL_CLIENT_SECRET=${clientSecret}`;
            }
            if (!envContent.includes('GMAIL_REFRESH_TOKEN=')) {
              envContent += `\nGMAIL_REFRESH_TOKEN=${refreshToken}`;
            } else {
              envContent = envContent.replace(/GMAIL_REFRESH_TOKEN=.*/, `GMAIL_REFRESH_TOKEN=${refreshToken}`);
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('✓ Automatically updated your local backend/.env file!\n');
          }

          server.close();
          rl.close();
          process.exit(0);
        }
      }
    } catch (err) {
      console.error('\nError exchanging code for tokens:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log('\n------------------------------------------------------');
    console.log('Step 1: In Google Cloud Console, ensure this Authorized redirect URI is added:');
    console.log(`        ${REDIRECT_URI}`);
    console.log('------------------------------------------------------');
    console.log('\nStep 2: Open this URL in your browser to authorize Gmail:');
    console.log(`\n${authUrl}\n`);
    console.log('Waiting for you to log in in your browser...\n');
  });
}

main();
