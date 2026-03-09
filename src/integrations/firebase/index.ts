import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBLGDwJ0_3ZntPVkpEC-YRtF8TsLymZYxI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "memora-b9d52.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "memora-b9d52",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "memora-b9d52.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1062122019851",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1062122019851:web:3135963295f48d4816bb0e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set scopes for Google provider
googleProvider.addScope('profile');
googleProvider.addScope('email');

export {
  auth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  googleProvider,
};
