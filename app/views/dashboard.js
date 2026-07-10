// ============================================================
// Dashboard view: follow-ups due, renewals due, tasks due, quick stats.
// ============================================================
import { listClients, listAllInteractions, listTasks } from "../db.js";
import { fmtDate, daysUntil, todayStr, escapeHtml } from "../utils.js";
import { hydrateIcons } from "../icons.js";

export async function renderDashboard(content) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-dashboard").content.cloneNode(true));
  hydrateIcons(content);
  document.getElementById("today-label").textContent = "Today: " + fmtDate(todayStr());

  const [clients, interactions] = await Promise.all([listClients(), listAllInteractions()]);
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));

  // Follow-ups due today or overdue
  const followUps = interactions
    .filter((i) => i.followUpDate && !i.followUpDone && daysUntil(i.followUpDate) <= 0)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));

  const fuWrap = document.getElementById("dash-followups");
  if (followUps.length === 0) {
    fuWrap.innerHTML = '<div class="empty-note">Nothing due. You\'re caught up.</div>';
  } else {
    fuWrap.innerHTML = "";
    followUps.forEach((i) => {
      const c = clientsById[i.clientId];
      const overdue = daysUntil(i.followUpDate) < 0;
      const a = document.createElement("a");
      a.href = `#/clients/${i.clientId}`;
      a.className = "list-item";
      a.innerHTML = `<span>${c ? escapeHtml(c.fullName) : "Unknown client"} — ${escapeHtml(i.summary || "").slice(0, 60)}</span>
        <span class="tag ${overdue ? "overdue" : ""}">${fmtDate(i.followUpDate)}</span>`;
      fuWrap.appendChild(a);
    });
  }

  // Renewals in next 90 days
  const renewals = clients
    .filter((c) => c.renewalDate && daysUntil(c.renewalDate) >= 0 && daysUntil(c.renewalDate) <= 90)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  const rnWrap = document.getElementById("dash-renewals");
  if (renewals.length === 0) {
    rnWrap.innerHTML = '<div class="empty-note">No renewals in the next 90 days.</div>';
  } else {
    rnWrap.innerHTML = "";
    renewals.forEach((c) => {
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
  const dueTasks = tasks
    .filter((t) => !t.done && t.dueDate && daysUntil(t.dueDate) <= 0)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const taskWrap = document.getElementById("dash-tasks");
  if (dueTasks.length === 0) {
    taskWrap.innerHTML = '<div class="empty-note">No tasks due.</div>';
  } else {
    taskWrap.innerHTML = "";
    dueTasks.forEach((t) => {
      const c = t.clientId ? clientsById[t.clientId] : null;
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
  const active = clients.filter((c) => c.status === "Active Client").length;
  const leads = clients.filter((c) => ["New Lead", "Quoted"].includes(c.status)).length;
  document.getElementById("dash-stats").innerHTML = `
    <div class="stat"><div class="num">${clients.length}</div><div class="label">Total Clients</div></div>
    <div class="stat"><div class="num">${active}</div><div class="label">Active</div></div>
    <div class="stat"><div class="num">${leads}</div><div class="label">Leads in Pipeline</div></div>
    <div class="stat"><div class="num">${followUps.length}</div><div class="label">Follow-ups Due</div></div>
  `;
}
