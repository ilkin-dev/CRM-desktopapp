// ============================================================
// FIREBASE CONFIG — fill this in with YOUR project's values.
// You get these from: Firebase Console → Project Settings →
// "Your apps" → Web app → SDK setup and configuration.
// These values are safe to be public in front-end code; your
// data is protected by Firestore Security Rules + Auth, not by
// hiding this config.
// ============================================================
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

// If you ever want to restrict the app to only your account,
// this is enforced server-side by Firestore rules (see
// firestore.rules.txt) — this file alone doesn't grant access.
