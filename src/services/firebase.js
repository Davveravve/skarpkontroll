// src/services/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABappiz_0byyHc6vHDsR2xnBSIHOcBo_A",
  authDomain: "skarpkontrollv2-9e81f.firebaseapp.com",
  projectId: "skarpkontrollv2-9e81f",
  storageBucket: "skarpkontrollv2-9e81f.firebasestorage.app",
  messagingSenderId: "452011396220",
  appId: "1:452011396220:web:16f6728ee6d0165fc50df9",
  measurementId: "G-BPGEKF3TTG"
};

// Initialize Firebase (endast en gång, även vid hot-reload)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Exportera Firebase-tjänster
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { app, analytics };