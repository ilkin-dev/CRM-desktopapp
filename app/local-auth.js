// ============================================================
// Local auth: no network, no accounts — just a single password gate
// checked via IPC against a bcrypt hash stored in the local SQLite
// database (see db/auth.js). Replaces firebase-init.js.
// ============================================================
let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export async function hasPassword() {
  return window.crmAPI.auth.hasPassword();
}

export async function setPassword(password) {
  await window.crmAPI.auth.setPassword(password);
  currentUser = { email: "Local account" };
  return currentUser;
}

export async function login(password) {
  const ok = await window.crmAPI.auth.login(password);
  if (!ok) {
    const err = new Error("Incorrect password.");
    err.code = "invalid-credential";
    throw err;
  }
  currentUser = { email: "Local account" };
  return currentUser;
}

export async function logout() {
  await window.crmAPI.auth.logout();
  currentUser = null;
}
