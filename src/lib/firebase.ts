import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCQDQ_OARDp_aj0mNkkysbk_1dfGghO4TY",
  authDomain: "wil-trading-journal.firebaseapp.com",
  projectId: "wil-trading-journal",
  storageBucket: "wil-trading-journal.firebasestorage.app",
  messagingSenderId: "687635357951",
  appId: "1:687635357951:web:7d987fef758aa50f1b6cca",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
