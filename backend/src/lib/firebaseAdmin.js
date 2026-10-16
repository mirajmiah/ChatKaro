import fs from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '/etc/secrets/firebase-service-account.json';

if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
  } else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    console.warn('Firebase Admin is not configured; Firebase sign-in endpoints will be unavailable.');
  }
}

export const verifyFirebaseIdToken = async (idToken) => {
  if (getApps().length === 0) {
    throw new Error('Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.');
  }
  return getAuth().verifyIdToken(idToken);
};
