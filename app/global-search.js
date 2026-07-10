// ============================================================
// Global search (Ctrl+K / Cmd+K): searches clients, tasks, and
// interactions from anywhere in the app and jumps to the matching
// client on selection.
// ============================================================
import { listClients, listTasks, listAllInteractions } from "./db.js";
import { escapeHtml } from "./utils.js";
import { icon } from "./icons.js";

const MAX_PER_GROUP = 5;

let overlay, input, resultsEl, appShell;
let activeIndex = -1;
let currentResults = [];

export function initGlobalSearch() {
  overlay = document.getElementById("global-search-overlay");
  input = document.getElementById("global-search-input");
  resultsEl = document.getElementById("global-search-results");
  appShell = document.getElementById("app");

  document.getElementById("global-search-trigger").addEventListener("click", open);
  document.getElementById("global-search-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", (e) => {
    const isK = e.key === "k" || e.key === "K";
    if ((e.ctrlKey || e.metaKey) && isK) {
      e.preventDefault();
      if (!appShell.classList.contains("hidden")) {
        overlay.classList.contains("hidden") ? open() : close();
      }
      return;
    }
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
      close();
    }
  });

  input.addEventListener("input", () => runSearch(input.value.trim()));
  input.addEventListener("keydown", handleResultsKeydown);
}

function open() {
  overlay.classList.remove("hidden");
  input.value = "";
  runSearch("");
  input.focus();
}

function close() {
  overlay.classList.add("hidden");
}

async function runSearch(term) {
  if (!term) {
    resultsEl.innerHTML = '<div class="search-empty">Type to search clients, tasks, and interactions.</div>';
    currentResults = [];
    activeIndex = -1;
    return;
  }
  const lower = term.toLowerCase();
  const [clients, tasks, interactions] = await Promise.all([listClients(), listTasks(), listAllInteractions()]);
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));

  const clientMatches = clients
    .filter((c) => [c.fullName, c.phone, c.email].some((v) => (v || "").toLowerCase().includes(lower)))
    .slice(0, MAX_PER_GROUP)
    .map((c) => ({
      group: "Clients",
      icon: "clients",
      title: c.fullName,
      sub: c.phone || c.email || "",
      href: `#/clients/${c.id}`,
    }));

  const taskMatches = tasks
    .filter((t) => (t.title || "").toLowerCase().includes(lower))
    .slice(0, MAX_PER_GROUP)
    .map((t) => ({
      group: "Tasks",
      icon: "tasks",
      title: t.title,
      sub: t.clientId && clientsById[t.clientId] ? clientsById[t.clientId].fullName : "Unlinked task",
      href: t.clientId ? `#/clients/${t.clientId}` : "#/tasks",
    }));

  const interactionMatches = interactions
    .filter((i) => (i.summary || "").toLowerCase().includes(lower))
    .slice(0, MAX_PER_GROUP)
    .map((i) => ({
      group: "Interactions",
      icon: "note",
      title: (i.summary || "").slice(0, 80),
      sub: clientsById[i.clientId] ? `${i.type} — ${clientsById[i.clientId].fullName}` : i.type,
      href: `#/clients/${i.clientId}`,
    }));

  currentResults = [...clientMatches, ...taskMatches, ...interactionMatches];
  activeIndex = currentResults.length ? 0 : -1;
  renderResults();
}

function renderResults() {
  if (currentResults.length === 0) {
    resultsEl.innerHTML = '<div class="search-empty">No matches.</div>';
    return;
  }
  let html = "";
  let lastGroup = null;
  currentResults.forEach((r, idx) => {
    if (r.group !== lastGroup) {
      html += `<div class="search-group-label">${escapeHtml(r.group)}</div>`;
      lastGroup = r.group;
    }
    html += `
      <a href="${r.href}" class="search-result-item${idx === activeIndex ? " active" : ""}" data-index="${idx}">
        ${icon(r.icon, { className: "icon" })}
        <div>
          <div class="search-result-title">${escapeHtml(r.title)}</div>
          <div class="search-result-sub">${escapeHtml(r.sub)}</div>
        </div>
      </a>
    `;
  });
  resultsEl.innerHTML = html;
  resultsEl.querySelectorAll(".search-result-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      goToResult(Number(el.dataset.index));
    });
  });
}

function goToResult(idx) {
  const r = currentResults[idx];
  if (!r) return;
  close();
  window.location.hash = r.href;
}

function handleResultsKeydown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (currentResults.length === 0) return;
    activeIndex = (activeIndex + 1) % currentResults.length;
    renderResults();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (currentResults.length === 0) return;
    activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
    renderResults();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIndex >= 0) goToResult(activeIndex);
  }
}
