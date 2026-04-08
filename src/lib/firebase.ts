import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxxZALqu3xBHmxy3pWYmEzBxCez26X6Xo",
  authDomain: "work-hub-53aa2.firebaseapp.com",
  projectId: "work-hub-53aa2",
  storageBucket: "work-hub-53aa2.firebasestorage.app",
  messagingSenderId: "663145015312",
  appId: "1:663145015312:web:e173a6ceb3e4bca5654295",
  measurementId: "G-LP4M4T9YCN"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, db, googleProvider };
