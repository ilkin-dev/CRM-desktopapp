// ============================================================
// FIREBASE CONFIG — fill this in with YOUR project's values.
// You get these from: Firebase Console → Project Settings →
// "Your apps" → Web app → SDK setup and configuration.
// These values are safe to be public in front-end code; your
// data is protected by Firestore Security Rules + Auth, not by
// hiding this config.
// ============================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBuCNLW6xi6sHYi0cNEmiMzbAPH6BLlNZo",
  authDomain: "cra-desktopapp.firebaseapp.com",
  projectId: "cra-desktopapp",
  storageBucket: "cra-desktopapp.firebasestorage.app",
  messagingSenderId: "369787339762",
  appId: "1:369787339762:web:5f66275477b28e1157a16b",
};

// If you ever want to restrict the app to only your account,
// this is enforced server-side by Firestore rules (see
// firestore.rules.txt) — this file alone doesn't grant access.
