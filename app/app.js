// ============================================================
// Main app: auth gating + hash router.
// View rendering lives in views/*.js — this file only wires auth
// state to the login/app shell and dispatches routes.
// ============================================================
import { hasPassword, setPassword, login, logout, getCurrentUser } from "./local-auth.js";
import { hydrateIcons } from "./icons.js";
import { initGlobalSearch } from "./global-search.js";
import { initNotifications } from "./notifications.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderClientsList } from "./views/clients-list.js";
import { renderClientForm } from "./views/client-form.js";
import { renderClientDetail } from "./views/client-detail.js";
import { renderTasks } from "./views/tasks.js";
import { renderCommissions } from "./views/commissions.js";
import { renderReports } from "./views/reports.js";

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app");
const content = document.getElementById("content");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubtitle = document.getElementById("login-subtitle");
const loginPasswordLabel = document.getElementById("login-password-label");
const loginConfirmWrap = document.getElementById("login-confirm-wrap");
const loginPasswordConfirm = document.getElementById("login-password-confirm");
const loginSubmitLabel = document.getElementById("login-submit-label");

// Static shell (sidebar nav, brand marks, logout button, login screen)
// never gets re-rendered per route, so hydrate its icon placeholders once.
hydrateIcons(document);
initGlobalSearch();

// ---------------- Auth wiring ----------------
// No network, no persisted session: every fresh launch of the app
// re-locks (the main process's "unlocked" flag is in-memory and resets
// per process start) — that's the whole point of a local lock screen.

let notificationsStarted = false;
let isFirstRun = false;

function showUnlockedShell(user) {
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  document.getElementById("user-email").textContent = user.email;
  if (!notificationsStarted) {
    notificationsStarted = true;
    initNotifications();
  }
  router();
}

async function boot() {
  isFirstRun = !(await hasPassword());
  if (isFirstRun) {
    loginSubtitle.textContent = "Set a password to protect your client data";
    loginPasswordLabel.textContent = "New Password";
    loginConfirmWrap.classList.remove("hidden");
    loginPasswordConfirm.required = true;
    loginSubmitLabel.textContent = "Set Password";
  }
}
boot();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const password = document.getElementById("login-password").value;
  try {
    if (isFirstRun) {
      if (password !== loginPasswordConfirm.value) {
        loginError.textContent = "Passwords don't match.";
        return;
      }
      if (password.length < 4) {
        loginError.textContent = "Password must be at least 4 characters.";
        return;
      }
      showUnlockedShell(await setPassword(password));
    } else {
      showUnlockedShell(await login(password));
    }
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await logout();
  loginScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.getElementById("login-password").value = "";
});

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  if (code.includes("invalid-credential")) return "Incorrect password.";
  return "Sign-in failed. Please try again.";
}

// ---------------- Router ----------------

window.addEventListener("hashchange", router);

function router() {
  if (!getCurrentUser()) return;
  const hash = window.location.hash || "#/dashboard";
  document.querySelectorAll(".nav-link").forEach((a) => a.classList.remove("active"));

  if (hash.startsWith("#/clients/new")) {
    setActive("new-client");
    renderClientForm(content, null);
  } else if (/^#\/clients\/[^/]+\/edit/.test(hash)) {
    const id = hash.split("/")[2];
    setActive("clients");
    renderClientForm(content, id);
  } else if (/^#\/clients\/[^/]+/.test(hash)) {
    const id = hash.split("/")[2];
    setActive("clients");
    renderClientDetail(content, id);
  } else if (hash.startsWith("#/clients")) {
    setActive("clients");
    renderClientsList(content);
  } else if (hash.startsWith("#/tasks")) {
    setActive("tasks");
    renderTasks(content);
  } else if (hash.startsWith("#/commissions")) {
    setActive("commissions");
    renderCommissions(content);
  } else if (hash.startsWith("#/reports")) {
    setActive("reports");
    renderReports(content);
  } else {
    setActive("dashboard");
    renderDashboard(content);
  }
}

function setActive(route) {
  const el = document.querySelector(`.nav-link[data-route="${route}"]`);
  if (el) el.classList.add("active");
}
