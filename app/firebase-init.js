// ============================================================
// Firebase app + auth initialization. Single source of truth
// for the current signed-in user across the app.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let currentUser = null;

export function getUid() {
  return currentUser ? currentUser.uid : null;
}

export function getCurrentUser() {
  return currentUser;
}

export function watchAuth(onSignedIn, onSignedOut) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) onSignedIn(user);
    else onSignedOut();
  });
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}
