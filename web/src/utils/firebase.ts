/**
 * AEGIS X — Firebase Production Configuration
 * Project: aegis-x-43e75
 */
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDrF71y2w_uAL9wn1UiNvFNLlcB5iRxq28",
  authDomain: "aegis-x-43e75.firebaseapp.com",
  projectId: "aegis-x-43e75",
  storageBucket: "aegis-x-43e75.firebasestorage.app",
  messagingSenderId: "543357106887",
  appId: "1:543357106887:web:241ff05ff620845f251ce2",
};

// Initialize Firebase (prevent double-init in dev)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

// ── Auth Helpers ──────────────────────────────────────────────────────────────

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const firebaseSignOut = () => signOut(auth);

export const onFirebaseAuthChange = (callback: (user: FirebaseUser | null) => void) =>
  onAuthStateChanged(auth, callback);

// ── FCM Push Notifications ────────────────────────────────────────────────────
const VAPID_KEY = "BBhjWfgcGMG8r14G_5ngI6aq7-pJ_g-4Yo8XTAaCLw6GK0-dwJPx5b8asEk_OhzM1AtBt2XelLrdC0aF5x2Ioko";

let messaging: Messaging | null = null;

export const initMessaging = async (): Promise<string | null> => {
  try {
    // FCM only works in secure contexts with SW support
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }
    messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      console.log("✅ FCM Token obtained:", token.slice(0, 20) + "...");
      localStorage.setItem("aegis_fcm_token", token);
      return token;
    }
    return null;
  } catch (err) {
    // FCM may fail in non-HTTPS or blocked notification environments
    console.warn("FCM token unavailable:", err);
    return null;
  }
};

export const onFCMMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

export default app;
