import type { FirebaseOptions } from "firebase/app";

// Firebase web config (public by design; access is controlled by database.rules.json).
// Set to null to use the local stand-in (same-browser tabs only).
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: "AIzaSyAVlNwNZLQIMnQb_l7BOPJ_7maVy9S2dhg",
  authDomain: "gria-5514c.firebaseapp.com",
  databaseURL: "https://gria-5514c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gria-5514c",
  storageBucket: "gria-5514c.firebasestorage.app",
  messagingSenderId: "238641034564",
  appId: "1:238641034564:web:fe86a46fb783d7bfe75311",
};

// SHA-256 of "hunt:<PIN>". Change the PIN with:
//   node -e "console.log(require('crypto').createHash('sha256').update('hunt:1234').digest('hex'))"
export const ADMIN_PIN_HASH = "1fdba4a16aebf0818116a1894e6d9e9b83ab332848988d0cfedfd0af07bd5645";
