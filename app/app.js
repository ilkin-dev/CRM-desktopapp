// ============================================================
// Main app: auth gating + hash router + view rendering.
// ============================================================
import { watchAuth, login, logout, getCurrentUser } from "./firebase-init.js";
import {
  STATUSES, listClients, getClient, createClient, updateClient, deleteClient,
  listInteractionsForClient, listAllInteractions, createInteraction,
  listTasks, createTask, updateTask, deleteTask
} from "./db.js";

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app");
const content = document.getElementById("content");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

// ---------------- Auth wiring ----------------

watchAuth(
  (user) => {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    document.getElementById("user-email").textContent = user.email;
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
  document.querySelectorAll(".nav-link").forEach(a => a.classList.remove("active"));

  if (hash.startsWith("#/clients/new")) {
    setActive("new-client");
    renderClientForm(null);
  } else if (/^#\/clients\/[^/]+\/edit/.test(hash)) {
    const id = hash.split("/")[2];
    setActive("clients");
    renderClientForm(id);
  } else if (/^#\/clients\/[^/]+/.test(hash)) {
    const id = hash.split("/")[2];
    setActive("clients");
    renderClientDetail(id);
  } else if (hash.startsWith("#/clients")) {
    setActive("clients");
    renderClientsList();
  } else if (hash.startsWith("#/tasks")) {
    setActive("tasks");
    renderTasks();
  } else if (hash.startsWith("#/commissions")) {
    setActive("commissions");
    renderCommissions();
  } else {
    setActive("dashboard");
    renderDashboard();
  }
}

function setActive(route) {
  const el = document.querySelector(`.nav-link[data-route="${route}"]`);
  if (el) el.classList.add("active");
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function statusClass(status) {
  return "status-" + String(status).replace(/[^a-zA-Z0-9]+/g, "-");
}

// ---------------- Dashboard ----------------

async function renderDashboard() {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-dashboard").content.cloneNode(true));
  document.getElementById("today-label").textContent = "Today: " + fmtDate(todayStr());

  const [clients, interactions] = await Promise.all([listClients(), listAllInteractions()]);
  const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));

  // Follow-ups due today or overdue
  const followUps = interactions
    .filter(i => i.followUpDate && !i.followUpDone && daysUntil(i.followUpDate) <= 0)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

  const fuWrap = document.getElementById("dash-followups");
  if (followUps.length === 0) {
    fuWrap.innerHTML = '<div class="empty-note">Nothing due. You\'re caught up.</div>';
  } else {
    fuWrap.innerHTML = "";
    followUps.forEach(i => {
      const c = clientsById[i.clientId];
      const overdue = daysUntil(i.followUpDate) < 0;
      const a = document.createElement("a");
      a.href = `#/clients/${i.clientId}`;
      a.className = "list-item";
      a.innerHTML = `<span>${c ? c.fullName : "Unknown client"} — ${escapeHtml(i.summary || "").slice(0, 60)}</span>
        <span class="tag ${overdue ? "overdue" : ""}">${fmtDate(i.followUpDate)}</span>`;
      fuWrap.appendChild(a);
    });
  }

  // Renewals in next 90 days
  const renewals = clients
    .filter(c => c.renewalDate && daysUntil(c.renewalDate) >= 0 && daysUntil(c.renewalDate) <= 90)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  const rnWrap = document.getElementById("dash-renewals");
  if (renewals.length === 0) {
    rnWrap.innerHTML = '<div class="empty-note">No renewals in the next 90 days.</div>';
  } else {
    rnWrap.innerHTML = "";
    renewals.forEach(c => {
      const d = daysUntil(c.renewalDate);
      const a = document.createElement("a");
      a.href = `#/clients/${c.id}`;
      a.className = "list-item";
      a.innerHTML = `<span>${escapeHtml(c.fullName)} — ${escapeHtml(c.lineOfBusiness || "")}</span>
        <span class="tag ${d <= 14 ? "overdue" : ""}">${fmtDate(c.renewalDate)} (${d}d)</span>`;
      rnWrap.appendChild(a);
    });
  }

  // Tasks due today or overdue
  const tasks = await listTasks();
  const clientsByIdForTasks = clientsById;
  const dueTasks = tasks
    .filter(t => !t.done && t.dueDate && daysUntil(t.dueDate) <= 0)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const taskWrap = document.getElementById("dash-tasks");
  if (dueTasks.length === 0) {
    taskWrap.innerHTML = '<div class="empty-note">No tasks due.</div>';
  } else {
    taskWrap.innerHTML = "";
    dueTasks.forEach(t => {
      const c = t.clientId ? clientsByIdForTasks[t.clientId] : null;
      const overdue = daysUntil(t.dueDate) < 0;
      const div = document.createElement("a");
      div.href = c ? `#/clients/${t.clientId}` : "#/tasks";
      div.className = "list-item";
      div.innerHTML = `<span>${escapeHtml(t.title)}${c ? " — " + escapeHtml(c.fullName) : ""}</span>
        <span class="tag ${overdue ? "overdue" : ""}">${fmtDate(t.dueDate)}</span>`;
      taskWrap.appendChild(div);
    });
  }

  // Stats
  const active = clients.filter(c => c.status === "Active Client").length;
  const leads = clients.filter(c => ["New Lead", "Quoted"].includes(c.status)).length;
  document.getElementById("dash-stats").innerHTML = `
    <div class="stat"><div class="num">${clients.length}</div><div class="label">Total Clients</div></div>
    <div class="stat"><div class="num">${active}</div><div class="label">Active</div></div>
    <div class="stat"><div class="num">${leads}</div><div class="label">Leads in Pipeline</div></div>
    <div class="stat"><div class="num">${followUps.length}</div><div class="label">Follow-ups Due</div></div>
  `;
}

// ---------------- Clients list ----------------

async function renderClientsList() {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-clients").content.cloneNode(true));

  const statusFilter = document.getElementById("status-filter");
  STATUSES.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusFilter.appendChild(opt);
  });

  const clients = await listClients();
  const interactions = await listAllInteractions();
  const lastContactByClient = {};
  interactions.forEach(i => {
    if (!lastContactByClient[i.clientId] || i.date > lastContactByClient[i.clientId]) {
      lastContactByClient[i.clientId] = i.date;
    }
  });

  function draw() {
    const term = document.getElementById("client-search").value.trim().toLowerCase();
    const status = statusFilter.value;
    const tbody = document.getElementById("clients-tbody");
    tbody.innerHTML = "";
    const filtered = clients.filter(c => {
      const matchesTerm = !term || [c.fullName, c.phone, c.email].some(v => (v || "").toLowerCase().includes(term));
      const matchesStatus = !status || c.status === status;
      return matchesTerm && matchesStatus;
    });
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-note">No clients found.</td></tr>`;
      return;
    }
    filtered.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    filtered.forEach(c => {
      const tr = document.createElement("tr");
      tr.className = "clickable";
      tr.innerHTML = `
        <td>${escapeHtml(c.fullName || "")}</td>
        <td><span class="badge ${statusClass(c.status)}">${escapeHtml(c.status || "")}</span></td>
        <td>${escapeHtml(c.lineOfBusiness || "—")}</td>
        <td>${fmtDate(c.renewalDate)}</td>
        <td>${escapeHtml(c.phone || "—")}</td>
        <td>${fmtDate(lastContactByClient[c.id])}</td>
      `;
      tr.addEventListener("click", () => { window.location.hash = `#/clients/${c.id}`; });
      tbody.appendChild(tr);
    });
  }

  document.getElementById("client-search").addEventListener("input", draw);
  statusFilter.addEventListener("change", draw);
  draw();
}

// ---------------- Client form (add/edit) ----------------

async function renderClientForm(clientId) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-client-form").content.cloneNode(true));

  const statusSelect = document.getElementById("f-status");
  STATUSES.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusSelect.appendChild(opt);
  });

  let existing = null;
  if (clientId) {
    existing = await getClient(clientId);
    document.getElementById("client-form-title").textContent = "Edit Client";
    document.getElementById("f-fullName").value = existing.fullName || "";
    document.getElementById("f-status").value = existing.status || "New Lead";
    document.getElementById("f-phone").value = existing.phone || "";
    document.getElementById("f-email").value = existing.email || "";
    document.getElementById("f-lob").value = existing.lineOfBusiness || "";
    document.getElementById("f-carrier").value = existing.carrier || "";
    document.getElementById("f-renewalDate").value = existing.renewalDate || "";
    document.getElementById("f-referralSource").value = existing.referralSource || "";
    document.getElementById("f-notes").value = existing.notes || "";
    const delBtn = document.getElementById("delete-client-btn");
    delBtn.classList.remove("hidden");
    delBtn.addEventListener("click", async () => {
      if (confirm(`Delete ${existing.fullName}? This also removes their interaction history. This cannot be undone.`)) {
        await deleteClient(clientId);
        window.location.hash = "#/clients";
      }
    });
  } else {
    statusSelect.value = "New Lead";
  }

  document.getElementById("client-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      fullName: document.getElementById("f-fullName").value.trim(),
      status: document.getElementById("f-status").value,
      phone: document.getElementById("f-phone").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      lineOfBusiness: document.getElementById("f-lob").value.trim(),
      carrier: document.getElementById("f-carrier").value.trim(),
      renewalDate: document.getElementById("f-renewalDate").value,
      referralSource: document.getElementById("f-referralSource").value.trim(),
      notes: document.getElementById("f-notes").value.trim(),
    };
    if (!data.fullName) return;
    if (clientId) {
      await updateClient(clientId, data);
      window.location.hash = `#/clients/${clientId}`;
    } else {
      const ref = await createClient(data);
      window.location.hash = `#/clients/${ref.id}`;
    }
  });
}

// ---------------- Client detail ----------------

async function renderClientDetail(clientId) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-client-detail").content.cloneNode(true));

  const client = await getClient(clientId);
  if (!client) {
    content.innerHTML = '<div class="card">Client not found. <a href="#/clients">Back to clients</a></div>';
    return;
  }

  document.getElementById("detail-name").textContent = client.fullName;
  const statusEl = document.getElementById("detail-status");
  statusEl.textContent = client.status;
  statusEl.className = "badge " + statusClass(client.status);
  document.getElementById("edit-client-link").href = `#/clients/${clientId}/edit`;

  document.getElementById("detail-info").innerHTML = `
    <dt>Phone</dt><dd>${escapeHtml(client.phone || "—")}</dd>
    <dt>Email</dt><dd>${escapeHtml(client.email || "—")}</dd>
    <dt>Line(s) of Business</dt><dd>${escapeHtml(client.lineOfBusiness || "—")}</dd>
    <dt>Carrier</dt><dd>${escapeHtml(client.carrier || "—")}</dd>
    <dt>Renewal Date</dt><dd>${fmtDate(client.renewalDate)}</dd>
    <dt>Referral Source</dt><dd>${escapeHtml(client.referralSource || "—")}</dd>
    <dt>Notes</dt><dd>${escapeHtml(client.notes || "—")}</dd>
  `;

  document.getElementById("i-date").value = todayStr();

  const typeSelect = document.getElementById("i-type");
  const quoteAmountWrap = document.getElementById("i-quote-amount-wrap");
  const quoteLOBWrap = document.getElementById("i-quote-lob-wrap");
  const premiumWrap = document.getElementById("i-premium-wrap");
  const commissionRateWrap = document.getElementById("i-commission-rate-wrap");
  const commissionAmountWrap = document.getElementById("i-commission-amount-wrap");
  const premiumInput = document.getElementById("i-premiumAmount");
  const rateInput = document.getElementById("i-commissionRate");
  const commissionAmountInput = document.getElementById("i-commissionAmount");

  function toggleTypeFields() {
    const isQuote = typeSelect.value === "Quote";
    const isBind = typeSelect.value === "Bind";
    quoteAmountWrap.style.display = isQuote ? "" : "none";
    quoteLOBWrap.style.display = (isQuote || isBind) ? "" : "none";
    premiumWrap.style.display = isBind ? "" : "none";
    commissionRateWrap.style.display = isBind ? "" : "none";
    commissionAmountWrap.style.display = isBind ? "" : "none";
  }
  typeSelect.addEventListener("change", toggleTypeFields);
  toggleTypeFields();

  function autoCalcCommission() {
    const premium = Number(premiumInput.value)