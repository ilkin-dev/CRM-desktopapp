// ============================================================
// Notifications: in-app bell/badge/panel for due follow-ups, renewals,
// and tasks, plus native desktop toasts (via the browser Notification
// API, which Electron maps to real OS notifications) on a background
// timer. Native toasts only fire once per item per day — tracked in
// localStorage so re-checking every few minutes doesn't spam the user.
// ============================================================
import { listClients, listAllInteractions, listTasks } from "./db.js";
import { daysUntil, fmtDate, escapeHtml } from "./utils.js";
import { icon } from "./icons.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RENEWAL_WINDOW_DAYS = 3; // notify starting 3 days before renewal, through overdue
const NOTIFIED_KEY = "crm-notified-ids";
const NOTIFIED_DATE_KEY = "crm-notified-date";

let bellTrigger, badge, overlay, resultsEl;

export function initNotifications() {
  bellTrigger = document.getElementById("notif-bell-trigger");
  badge = document.getElementById("notif-badge");
  overlay = document.getElementById("notif-panel-overlay");
  resultsEl = document.getElementById("notif-panel-results");

  bellTrigger.addEventListener("click", openPanel);
  document.getElementById("notif-panel-close").addEventListener("click", closePanel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePanel();
  });

  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }

  refreshBadge();
  checkAndNotify();
  setInterval(() => {
    refreshBadge();
    checkAndNotify();
  }, CHECK_INTERVAL_MS);
}

async function getDueItems() {
  const [clients, interactions, tasks] = await Promise.all([listClients(), listAllInteractions(), listTasks()]);
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const items = [];

  interactions
    .filter((i) => i.followUpDate && !i.followUpDone && daysUntil(i.followUpDate) <= 0)
    .forEach((i) => {
      const c = clientsById[i.clientId];
      items.push({
        id: `followup:${i.id}`,
        group: "Follow-ups",
        icon: "renewal-due",
        title: c ? c.fullName : "Unknown client",
        sub: `Follow-up was due ${fmtDate(i.followUpDate)}`,
        href: `#/clients/${i.clientId}`,
      });
    });

  clients
    .filter((c) => c.renewalDate && daysUntil(c.renewalDate) <= RENEWAL_WINDOW_DAYS && daysUntil(c.renewalDate) >= -365)
    .forEach((c) => {
      items.push({
        id: `renewal:${c.id}`,
        group: "Renewals",
        icon: "calendar",
        title: c.fullName,
        sub: `Renewal ${fmtDate(c.renewalDate)}`,
        href: `#/clients/${c.id}`,
      });
    });

  tasks
    .filter((t) => !t.done && t.dueDate && daysUntil(t.dueDate) <= 0)
    .forEach((t) => {
      items.push({
        id: `task:${t.id}`,
        group: "Tasks",
        icon: "tasks",
        title: t.title,
        sub: t.clientId && clientsById[t.clientId] ? clientsById[t.clientId].fullName : `Due ${fmtDate(t.dueDate)}`,
        href: t.clientId ? `#/clients/${t.clientId}` : "#/tasks",
      });
    });

  return items;
}

async function refreshBadge() {
  const items = await getDueItems();
  if (items.length === 0) {
    badge.classList.add("hidden");
  } else {
    badge.textContent = String(items.length);
    badge.classList.remove("hidden");
  }
}

async function openPanel() {
  overlay.classList.remove("hidden");
  const items = await getDueItems();
  if (items.length === 0) {
    resultsEl.innerHTML = '<div class="search-empty">Nothing due. You\'re caught up.</div>';
    return;
  }
  let html = "";
  let lastGroup = null;
  items.forEach((item) => {
    if (item.group !== lastGroup) {
      html += `<div class="search-group-label">${escapeHtml(item.group)}</div>`;
      lastGroup = item.group;
    }
    html += `
      <a href="${item.href}" class="search-result-item" data-href="${item.href}">
        ${icon(item.icon, { className: "icon" })}
        <div>
          <div class="search-result-title">${escapeHtml(item.title)}</div>
          <div class="search-result-sub">${escapeHtml(item.sub)}</div>
        </div>
      </a>
    `;
  });
  resultsEl.innerHTML = html;
  resultsEl.querySelectorAll(".search-result-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closePanel();
      window.location.hash = el.dataset.href;
    });
  });
}

function closePanel() {
  overlay.classList.add("hidden");
}

function loadNotifiedIds() {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(NOTIFIED_DATE_KEY) !== today) {
    localStorage.setItem(NOTIFIED_DATE_KEY, today);
    localStorage.setItem(NOTIFIED_KEY, "[]");
    return new Set();
  }
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(set) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set)));
}

async function checkAndNotify() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const items = await getDueItems();
  const notified = loadNotifiedIds();
  let changed = false;
  items.forEach((item) => {
    if (notified.has(item.id)) return;
    const n = new Notification(item.title, { body: `${item.group.replace(/s$/, "")}: ${item.sub}` });
    n.onclick = () => {
      window.focus();
      window.location.hash = item.href;
    };
    notified.add(item.id);
    changed = true;
  });
  if (changed) saveNotifiedIds(notified);
}
