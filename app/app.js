// ============================================================
// Main app: auth gating + hash router + view rendering.
// ============================================================
import { watchAuth, login, logout, getCurrentUser } from "./firebase-init.js";
import {
  STATUSES, listClients, getClient, createClient, updateClient, deleteClient,
  listInteractionsForClient, listAllInteractions, createInteraction,
  listTasks, createTask, updateTask, deleteTask
} from "./db.js";
import {
  DOCUMENT_CATEGORIES, uploadClientDocument, listClientDocuments, deleteClientDocument
} from "./storage.js";

const LOB_OPTIONS = ["Auto", "Home", "Auto + Home Bundle", "Tenant", "Condo", "Business/Commercial", "Umbrella", "Other"];

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

const STATUS_EMOJI = {
  "New Lead": "🌱",
  "Quoted": "💬",
  "Bound": "🔒",
  "Active Client": "✅",
  "Renewal Due": "⏰",
  "Referral Source": "🤝",
  "Lapsed/Lost": "⚪",
};
function statusEmoji(status) { return STATUS_EMOJI[status] || "•"; }

const LOB_EMOJI = {
  "Auto": "🚗",
  "Home": "🏠",
  "Auto + Home Bundle": "🚗🏠",
  "Tenant": "🔑",
  "Condo": "🏢",
  "Business/Commercial": "🏬",
  "Umbrella": "☂️",
  "Other": "📋",
};
function lobEmoji(lob) { return LOB_EMOJI[lob] || "📄"; }

const DOC_EMOJI = {
  "Driver's License": "🪪",
  "Vehicle Photo": "🚗",
  "Bill of Sale": "🧾",
  "Finance Application": "💳",
  "Proof of Insurance": "📄",
  "Other": "📁",
};
function docEmoji(cat) { return DOC_EMOJI[cat] || "📁"; }

const TYPE_EMOJI = {
  "Call": "📞",
  "Quote": "💬",
  "Email": "✉️",
  "Meeting": "🤝",
  "Note": "📝",
  "Bind": "🔒",
  "DASH Report": "🪪",
};
function typeEmoji(type) { return TYPE_EMOJI[type] || "•"; }

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
    fuWrap.innerHTML = '<div class="empty-note">🎉 Nothing due. You\'re caught up.</div>';
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
    rnWrap.innerHTML = '<div class="empty-note">📅 No renewals in the next 90 days.</div>';
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
    taskWrap.innerHTML = '<div class="empty-note">🎉 No tasks due.</div>';
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
    <div class="stat"><div class="num">${clients.length}</div><div class="label">👥 Total Clients</div></div>
    <div class="stat"><div class="num">${active}</div><div class="label">✅ Active</div></div>
    <div class="stat"><div class="num">${leads}</div><div class="label">🌱 Leads in Pipeline</div></div>
    <div class="stat"><div class="num">${followUps.length}</div><div class="label">⏰ Follow-ups Due</div></div>
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
    opt.textContent = statusEmoji(s) + " " + s;
    statusFilter.appendChild(opt);
  });

  document.getElementById("clients-tbody").innerHTML =
    `<tr><td colspan="6"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;

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
        <td><span class="badge ${statusClass(c.status)}">${statusEmoji(c.status)} ${escapeHtml(c.status || "")}</span></td>
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
    opt.textContent = statusEmoji(s) + " " + s;
    statusSelect.appendChild(opt);
  });

  const phoneInput = document.getElementById("f-phone");
  attachPhoneFormatter(phoneInput);

  const lobGroup = document.getElementById("f-lob-group");
  const lobOtherInput = document.getElementById("f-lob-other");
  function syncLobOtherVisibility() {
    const checked = getLobCheckboxValues(lobGroup);
    lobOtherInput.classList.toggle("hidden", !checked.includes("Other"));
  }

  let existing = null;
  let existingLob = [];
  if (clientId) {
    existing = await getClient(clientId);
    document.getElementById("client-form-title").textContent = "✏️ Edit Client";
    document.getElementById("f-fullName").value = existing.fullName || "";
    document.getElementById("f-status").value = existing.status || "New Lead";
    phoneInput.value = existing.phone || "";
    document.getElementById("f-email").value = existing.email || "";
    document.getElementById("f-carrier").value = existing.carrier || "";
    document.getElementById("f-renewalDate").value = existing.renewalDate || "";
    document.getElementById("f-referralSource").value = existing.referralSource || "";
    document.getElementById("f-notes").value = existing.notes || "";

    // Parse stored comma-separated LOB string back into checkboxes,
    // treating any value not in the known list as "Other" free text.
    const stored = (existing.lineOfBusiness || "").split(",").map(s => s.trim()).filter(Boolean);
    const known = stored.filter(v => LOB_OPTIONS.includes(v));
    const unknown = stored.filter(v => !LOB_OPTIONS.includes(v));
    existingLob = known;
    if (unknown.length) {
      existingLob = existingLob.concat(["Other"]);
      lobOtherInput.value = unknown.join(", ");
    }

    const delBtn = document.getElementById("delete-client-btn");
    delBtn.classList.remove("hidden");
    delBtn.addEventListener("click", async () => {
      if (confirm(`Delete ${existing.fullName}? This also removes their interaction history. This cannot be undone.`)) {
        await deleteClient(clientId);
        toast(`${existing.fullName} deleted.`, "success");
        window.location.hash = "#/clients";
      }
    });
  } else {
    statusSelect.value = "New Lead";
  }

  buildLobCheckboxes(lobGroup, existingLob);
  syncLobOtherVisibility();
  lobGroup.addEventListener("change", syncLobOtherVisibility);

  document.getElementById("client-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkedLob = getLobCheckboxValues(lobGroup);
    const lobValues = checkedLob.filter(v => v !== "Other");
    if (checkedLob.includes("Other") && lobOtherInput.value.trim()) {
      lobValues.push(lobOtherInput.value.trim());
    }
    const data = {
      fullName: document.getElementById("f-fullName").value.trim(),
      status: document.getElementById("f-status").value,
      phone: phoneInput.value.trim(),
      email: document.getElementById("f-email").value.trim(),
      lineOfBusiness: lobValues.join(", "),
      carrier: document.getElementById("f-carrier").value.trim(),
      renewalDate: document.getElementById("f-renewalDate").value,
      referralSource: document.getElementById("f-referralSource").value.trim(),
      notes: document.getElementById("f-notes").value.trim(),
    };
    if (!data.fullName) return;
    if (clientId) {
      await updateClient(clientId, data);
      toast("Client updated.", "success");
      window.location.hash = `#/clients/${clientId}`;
    } else {
      const ref = await createClient(data);
      toast("Client added.", "success");
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
  statusEl.textContent = statusEmoji(client.status) + " " + client.status;
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
  const quoteAmountInput = document.getElementById("i-quoteAmount");
  const premiumInput = document.getElementById("i-premiumAmount");
  const rateInput = document.getElementById("i-commissionRate");
  const commissionAmountInput = document.getElementById("i-commissionAmount");
  applyFieldFormatters(document.getElementById("interaction-form"));

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
    const premium = currencyValue(premiumInput) || 0;
    const rate = Number(rateInput.value) || 0;
    if (premium && rate) commissionAmountInput.value = (premium * rate / 100).toFixed(2);
  }
  premiumInput.addEventListener("blur", autoCalcCommission);
  rateInput.addEventListener("input", autoCalcCommission);

  document.getElementById("interaction-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const isBind = typeSelect.value === "Bind";
    const data = {
      clientId,
      type: typeSelect.value,
      date: document.getElementById("i-date").value || todayStr(),
      summary: document.getElementById("i-summary").value.trim(),
      quoteAmount: currencyValue(quoteAmountInput),
      quoteLOB: document.getElementById("i-quoteLOB").value.trim() || null,
      followUpDate: document.getElementById("i-followUpDate").value || null,
      followUpDone: false,
      premiumAmount: isBind ? currencyValue(premiumInput) : null,
      commissionRate: isBind && rateInput.value ? Number(rateInput.value) : null,
      commissionAmount: isBind ? currencyValue(commissionAmountInput) : null,
    };
    if (!data.summary) return;
    await createInteraction(data);
    toast(isBind ? "Policy bind logged." : `${data.type} logged.`, "success");
    if (isBind) {
      // Binding a policy naturally moves the client to Active Client if they aren't already.
      const c = await getClient(clientId);
      if (c && c.status !== "Active Client") {
        await updateClient(clientId, { status: "Active Client" });
      }
    }
    renderClientDetail(clientId); // refresh
  });

  // ---- Documents ----
  const docCategorySelect = document.getElementById("doc-category");
  DOCUMENT_CATEGORIES.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = docEmoji(cat) + " " + cat;
    docCategorySelect.appendChild(opt);
  });

  const docStatus = document.getElementById("doc-upload-status");
  const docsGrid = document.getElementById("documents-grid");

  document.getElementById("document-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("doc-file");
    const file = fileInput.files[0];
    if (!file) return;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    docStatus.textContent = `Uploading ${file.name}...`;
    docStatus.classList.remove("error");
    try {
      await uploadClientDocument(clientId, docCategorySelect.value, file);
      docStatus.textContent = "";
      fileInput.value = "";
      toast("Document uploaded.", "success");
      await renderDocuments(clientId, docsGrid);
    } catch (err) {
      docStatus.textContent = "Upload failed: " + (err.message || "unknown error");
      docStatus.classList.add("error");
      toast("Upload failed.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  showSpinner(docsGrid);
  await renderDocuments(clientId, docsGrid);

  const interactions = await listInteractionsForClient(clientId);
  const timeline = document.getElementById("detail-timeline");
  if (interactions.length === 0) {
    timeline.innerHTML = '<div class="empty-note">🕒 No interactions logged yet.</div>';
  } else {
    timeline.innerHTML = "";
    interactions.forEach(i => {
      const div = document.createElement("div");
      div.className = "timeline-item";
      let extra = "";
      if (i.type === "Quote" && (i.quoteAmount || i.quoteLOB)) {
        extra = ` — ${i.quoteLOB || ""} ${i.quoteAmount ? "$" + i.quoteAmount.toLocaleString() : ""}`.trim();
      }
      if (i.type === "Bind" && (i.premiumAmount || i.commissionAmount)) {
        extra = ` — ${i.quoteLOB || ""} Premium: ${i.premiumAmount ? "$" + i.premiumAmount.toLocaleString() : "—"}, Commission: ${i.commissionAmount ? "$" + i.commissionAmount.toLocaleString() : "—"}`.trim();
      }
      const followUp = i.followUpDate ? ` <span class="tag">Follow-up: ${fmtDate(i.followUpDate)}</span>` : "";
      div.innerHTML = `
        <div class="meta"><span class="type-tag">${typeEmoji(i.type)} ${escapeHtml(i.type)}</span>${fmtDate(i.date)}${followUp}</div>
        <div class="summary">${escapeHtml(i.summary)}${extra ? "<br><em>" + escapeHtml(extra) + "</em>" : ""}</div>
      `;
      timeline.appendChild(div);
    });
  }
}

async function renderDocuments(clientId, gridEl) {
  let docs;
  try {
    docs = await listClientDocuments(clientId);
  } catch (err) {
    gridEl.innerHTML = `<div class="empty-note">Couldn't load documents: ${escapeHtml(err.message || "unknown error")}</div>`;
    return;
  }
  if (docs.length === 0) {
    gridEl.innerHTML = '<div class="empty-note">📎 No documents uploaded yet.</div>';
    return;
  }
  gridEl.innerHTML = "";
  docs.forEach(doc => {
    const card = document.createElement("div");
    card.className = "doc-card";
    card.innerHTML = `
      <div class="doc-thumb">
        ${isImageType(doc.contentType) ? `<img src="${doc.url}" alt="${escapeHtml(doc.name)}" />` : FILE_ICON_SVG}
      </div>
      <div class="doc-meta">
        <div class="doc-category">${docEmoji(doc.category)} ${escapeHtml(doc.category)}</div>
        <div class="doc-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
      </div>
      <div class="doc-actions">
        <a href="${doc.url}" target="_blank" rel="noopener">👁️ View</a>
        <button type="button" class="doc-delete">🗑️ Delete</button>
      </div>
    `;
    card.querySelector(".doc-delete").addEventListener("click", async () => {
      if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
      try {
        await deleteClientDocument(doc.path);
        toast("Document deleted.", "success");
        await renderDocuments(clientId, gridEl);
      } catch (err) {
        toast("Delete failed.", "error");
      }
    });
    gridEl.appendChild(card);
  });
}

// ---------------- Tasks ----------------

async function renderTasks() {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-tasks").content.cloneNode(true));

  const [tasks, clients] = await Promise.all([listTasks(), listClients()]);
  const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));

  const clientSelect = document.getElementById("t-clientId");
  clients
    .slice()
    .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
    .forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.fullName;
      clientSelect.appendChild(opt);
    });

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("t-title").value.trim();
    if (!title) return;
    await createTask({
      title,
      dueDate: document.getElementById("t-dueDate").value || null,
      clientId: document.getElementById("t-clientId").value || null,
      notes: document.getElementById("t-notes").value.trim(),
    });
    toast("Task added.", "success");
    renderTasks();
  });

  function taskRow(t) {
    const c = t.clientId ? clientsById[t.clientId] : null;
    const row = document.createElement("div");
    row.className = "task-row";
    const overdue = !t.done && t.dueDate && daysUntil(t.dueDate) < 0;
    row.innerHTML = `
      <input type="checkbox" ${t.done ? "checked" : ""} />
      <span class="task-title ${t.done ? "done" : ""}">${escapeHtml(t.title)}</span>
      ${c ? `<span class="task-client">${escapeHtml(c.fullName)}</span>` : ""}
      <span class="task-due" style="${overdue ? "color:#c0392b;font-weight:bold;" : ""}">${t.dueDate ? fmtDate(t.dueDate) : ""}</span>
      <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;">🗑️ Delete</button>
    `;
    row.querySelector('input[type="checkbox"]').addEventListener("change", async (ev) => {
      await updateTask(t.id, { done: ev.target.checked });
      renderTasks();
    });
    row.querySelector("button").addEventListener("click", async () => {
      if (confirm(`Delete task "${t.title}"?`)) {
        await deleteTask(t.id);
        toast("Task deleted.", "success");
        renderTasks();
      }
    });
    return row;
  }

  const openList = document.getElementById("tasks-open-list");
  const doneList = document.getElementById("tasks-done-list");
  const open = tasks.filter(t => !t.done).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const done = tasks.filter(t => t.done);

  openList.innerHTML = "";
  if (open.length === 0) openList.innerHTML = '<div class="empty-note">🎉 No open tasks.</div>';
  else open.forEach(t => openList.appendChild(taskRow(t)));

  doneList.innerHTML = "";
  if (done.length === 0) doneList.innerHTML = '<div class="empty-note">Nothing completed yet.</div>';
  else done.forEach(t => doneList.appendChild(taskRow(t)));
}

// ---------------- Commissions ----------------

async function renderCommissions() {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-commissions").content.cloneNode(true));

  const [interactions, clients] = await Promise.all([listAllInteractions(), listClients()]);
  const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));
  const binds = interactions
    .filter(i => i.type === "Bind")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalCommission = binds.reduce((sum, i) => sum + (i.commissionAmount || 0), 0);
  const totalPremium = binds.reduce((sum, i) => sum + (i.premiumAmount || 0), 0);
  const thisMonth = todayStr().slice(0, 7);
  const monthCommission = binds
    .filter(i => (i.date || "").slice(0, 7) === thisMonth)
    .reduce((sum, i) => sum + (i.commissionAmount || 0), 0);

  document.getElementById("comm-stats").innerHTML = `
    <div class="stat"><div class="num">${binds.length}</div><div class="label">🔒 Policies Bound</div></div>
    <div class="stat"><div class="num">$${totalPremium.toLocaleString()}</div><div class="label">💵 Total Premium</div></div>
    <div class="stat"><div class="num">$${totalCommission.toLocaleString()}</div><div class="label">💰 Total Commission</div></div>
    <div class="stat"><div class="num">$${monthCommission.toLocaleString()}</div><div class="label">📅 This Month</div></div>
  `;

  const tbody = document.getElementById("comm-tbody");
  tbody.innerHTML = "";
  if (binds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-note">No bound policies logged yet.</td></tr>';
  } else {
    binds.forEach(i => {
      const c = clientsById[i.clientId];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDate(i.date)}</td>
        <td>${c ? `<a href="#/clients/${i.clientId}">${escapeHtml(c.fullName)}</a>` : "—"}</td>
        <td>${escapeHtml(i.quoteLOB || "—")}</td>
        <td>${i.premiumAmount ? "$" + i.premiumAmount.toLocaleString() : "—"}</td>
        <td>${i.commissionRate ? i.commissionRate + "%" : "—"}</td>
        <td>${i.commissionAmount ? "$" + i.commissionAmount.toLocaleString() : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// ---------------- Utils ----------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(message, type) {
  const prefix = type === "success" ? "✅ " : type === "error" ? "⚠️ " : "🔔 ";
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = prefix + message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

function showSpinner(container) {
  container.innerHTML = "";
  container.appendChild(document.getElementById("tpl-spinner").content.cloneNode(true));
}

// Formats a phone number as (XXX) XXX-XXXX while the user types.
function attachPhoneFormatter(input) {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, 10);
    let out = digits;
    if (digits.length > 6) out = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    else if (digits.length > 3) out = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else if (digits.length > 0) out = `(${digits}`;
    input.value = out;
  });
}

// Shows a plain number while focused (easy editing), formats as
// currency with commas on blur. Reads/writes plain numeric strings
// via input.value regardless of display state.
function attachCurrencyFormatter(input) {
  function toPlain() {
    const n = Number(String(input.value).replace(/[^0-9.]/g, ""));
    input.value = n ? String(n) : "";
  }
  function toFormatted() {
    const n = Number(String(input.value).replace(/[^0-9.]/g, ""));
    input.value = n ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  }
  input.addEventListener("focus", toPlain);
  input.addEventListener("blur", toFormatted);
  if (input.value) toFormatted();
}

function currencyValue(input) {
  const n = Number(String(input.value).replace(/[^0-9.]/g, ""));
  return n || null;
}

// Auto-attaches formatters to any [data-format] input inside a container.
function applyFieldFormatters(container) {
  container.querySelectorAll('[data-format="phone"]').forEach(attachPhoneFormatter);
  container.querySelectorAll('[data-format="currency"]').forEach(attachCurrencyFormatter);
}

// Builds the Line-of-Business checkbox group into `container`, pre-checking
// values found in `selected` (array of strings). Returns a getValue() function.
function buildLobCheckboxes(container, selected) {
  container.innerHTML = "";
  const selectedSet = new Set(selected || []);
  LOB_OPTIONS.forEach(opt => {
    const label = document.createElement("label");
    label.className = "checkbox-pill";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = opt;
    cb.checked = selectedSet.has(opt);
    if (cb.checked) label.classList.add("checked");
    cb.addEventListener("change", () => label.classList.toggle("checked", cb.checked));
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + lobEmoji(opt) + " " + opt));
    container.appendChild(label);
  });
}

function getLobCheckboxValues(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

const FILE_ICON_SVG = '<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M14 2.5V7h4"/></svg>';

function isImageType(contentType) {
  return !!(contentType && contentType.startsWith("image/"));
}
