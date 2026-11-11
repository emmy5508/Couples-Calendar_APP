import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  connectFirestoreEmulator,
} from "firebase/firestore";
const emulated = import.meta.env.VITE_USE_EMULATORS === "true";
const app = initializeApp({
  apiKey: emulated ? "demo-key" : "AIzaSyCYeUAH9drcviRQlCsV9es1LXIyFXOXdLs",
  authDomain: "couples-calendar-97907.firebaseapp.com",
  projectId: emulated ? "demo-shared-calendar" : "couples-calendar-97907",
  storageBucket: "couples-calendar-97907.firebasestorage.app",
  messagingSenderId: "1094752188664",
  appId: "1:1094752188664:web:307889e141369cb5f0a30d",
});
// Email/password needs no cross-origin popup/redirect helper on startup.
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});
export const db = initializeFirestore(app, { localCache: memoryLocalCache() });
if (emulated) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
