// ============================================================
// Main app: auth gating + hash router.
// View rendering lives in views/*.js — this file only wires auth
// state to the login/app shell and dispatches routes.
// ============================================================
import { watchAuth, login, logout, getCurrentUser } from "./firebase-init.js";
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

// Static shell (sidebar nav, brand marks, logout button, login screen)
// never gets re-rendered per route, so hydrate its icon placeholders once.
hydrateIcons(document);
initGlobalSearch();

// ---------------- Auth wiring ----------------

let notificationsStarted = false;

watchAuth(
  (user) => {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    document.getElementById("user-email").textContent = user.email;
    if (!notificationsStarted) {
      notificationsStarted = true;
      initNotifications();
    }
    router();
  },
  () => {
    loginScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
  }
);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    await login(email, password);
  } catch (err) {
    loginError.textContent = friendlyAuthError(err);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => logout());

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Incorrect email or password.";
  }
  if (code.includes("too-many-requests")) return "Too many attempts. Try again shortly.";
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
