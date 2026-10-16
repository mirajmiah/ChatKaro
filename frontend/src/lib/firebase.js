import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'chatkaro-d676b.firebaseapp.com',
  projectId: 'chatkaro-d676b',
  storageBucket: 'chatkaro-d676b.firebasestorage.app',
  messagingSenderId: '735896927229',
  appId: '1:735896927229:web:00e3d91dee97629810f794',
  measurementId: 'G-WREE558ZNL',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
