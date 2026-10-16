import fs from 'node:fs';
import admin from 'firebase-admin';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '/etc/secrets/firebase-service-account.json';

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    console.warn('Firebase Admin is not configured; Firebase sign-in endpoints will be unavailable.');
  }
}

export const firebaseAdmin = admin;
export const verifyFirebaseIdToken = async (idToken) => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.');
  }
  return admin.auth().verifyIdToken(idToken);
};
