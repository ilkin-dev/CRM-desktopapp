// ============================================================
// Clients list view: searchable/filterable/sortable table, plus a
// drag-to-change-status kanban board grouped by client status.
// ============================================================
import { STATUSES, listClients, listAllInteractions, updateClient } from "../db.js";
import { fmtDate, escapeHtml, statusClass, statusIcon, LOB_OPTIONS } from "../utils.js";
import { icon, hydrateIcons } from "../icons.js";

const VIEW_STORAGE_KEY = "crm-clients-view";

export async function renderClientsList(content) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-clients").content.cloneNode(true));
  hydrateIcons(content);

  const statusFilter = document.getElementById("status-filter");
  STATUSES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusFilter.appendChild(opt);
  });

  const lobFilter = document.getElementById("lob-filter");
  LOB_OPTIONS.forEach((lob) => {
    const opt = document.createElement("option");
    opt.value = lob;
    opt.textContent = lob;
    lobFilter.appendChild(opt);
  });

  const carrierFilter = document.getElementById("carrier-filter");
  const renewalFromFilter = document.getElementById("renewal-from-filter");
  const renewalToFilter = document.getElementById("renewal-to-filter");
  const clearFiltersBtn = document.getElementById("clear-filters-btn");
  const tableWrap = document.querySelector(".table-wrap");
  const boardWrap = document.getElementById("clients-board-wrap");

  document.getElementById("clients-tbody").innerHTML =
    `<tr><td colspan="6"><div class="spinner-wrap"><div class="spinner"></div></div></td></tr>`;

  let clients = await listClients();
  const interactions = await listAllInteractions();
  const lastContactByClient = {};
  interactions.forEach((i) => {
    if (!lastContactByClient[i.clientId] || i.date > lastContactByClient[i.clientId]) {
      lastContactByClient[i.clientId] = i.date;
    }
  });

  const sortState = { key: "fullName", dir: 1 };
  let viewMode = localStorage.getItem(VIEW_STORAGE_KEY) === "board" ? "board" : "table";

  function sortValue(c, key) {
    if (key === "lastContact") return lastContactByClient[c.id] || "";
    return c[key] || "";
  }

  function compare(a, b) {
    const av = sortValue(a, sortState.key);
    const bv = sortValue(b, sortState.key);
    return String(av).localeCompare(String(bv)) * sortState.dir;
  }

  function updateSortIndicators() {
    document.querySelectorAll("#clients-table th.sortable").forEach((th) => {
      const slot = th.querySelector(".sort-icon-slot");
      const active = th.dataset.sort === sortState.key;
      slot.innerHTML = active
        ? icon("chevron", { className: `icon-sm sort-icon-active${sortState.dir === -1 ? " sort-icon-desc" : ""}` })
        : "";
      th.classList.toggle("sorted", active);
    });
  }

  function updateClearButtonVisibility() {
    const active = Boolean(
      statusFilter.value || carrierFilter.value.trim() || lobFilter.value ||
      renewalFromFilter.value || renewalToFilter.value
    );
    clearFiltersBtn.classList.toggle("hidden", !active);
  }

  function getFiltered() {
    const term = document.getElementById("client-search").value.trim().toLowerCase();
    const status = statusFilter.value;
    const carrier = carrierFilter.value.trim().toLowerCase();
    const lob = lobFilter.value;
    const renewalFrom = renewalFromFilter.value;
    const renewalTo = renewalToFilter.value;

    return clients.filter((c) => {
      const matchesTerm = !term || [c.fullName, c.phone, c.email].some((v) => (v || "").toLowerCase().includes(term));
      const matchesStatus = !status || c.status === status;
      const matchesCarrier = !carrier || (c.carrier || "").toLowerCase().includes(carrier);
      const lobParts = (c.lineOfBusiness || "").split(",").map((s) => s.trim());
      const matchesLob = !lob || lobParts.includes(lob);
      const matchesRenewalFrom = !renewalFrom || (c.renewalDate && c.renewalDate >= renewalFrom);
      const matchesRenewalTo = !renewalTo || (c.renewalDate && c.renewalDate <= renewalTo);
      return matchesTerm && matchesStatus && matchesCarrier && matchesLob && matchesRenewalFrom && matchesRenewalTo;
    });
  }

  function drawTable(filtered) {
    const tbody = document.getElementById("clients-tbody");
    tbody.innerHTML = "";
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-note">No clients found.</td></tr>`;
      return;
    }
    filtered.sort(compare);
    filtered.forEach((c) => {
      const tr = document.createElement("tr");
      tr.className = "clickable";
      tr.innerHTML = `
        <td>${escapeHtml(c.fullName || "")}</td>
        <td><span class="badge ${statusClass(c.status)}">${statusIcon(c.status)} ${escapeHtml(c.status || "")}</span></td>
        <td>${escapeHtml(c.lineOfBusiness || "—")}</td>
        <td class="date-col">${fmtDate(c.renewalDate)}</td>
        <td>${escapeHtml(c.phone || "—")}</td>
        <td class="date-col">${fmtDate(lastContactByClient[c.id])}</td>
      `;
      tr.addEventListener("click", () => {
        window.location.hash = `#/clients/${c.id}`;
      });
      tbody.appendChild(tr);
    });
  }

  function drawBoard(filtered) {
    const board = document.getElementById("clients-board");
    board.innerHTML = "";
    STATUSES.forEach((status) => {
      const column = document.createElement("div");
      column.className = "board-column";
      column.dataset.status = status;

      const clientsInColumn = filtered.filter((c) => c.status === status);
      column.innerHTML = `
        <div class="board-column-header">
          ${statusIcon(status)} ${escapeHtml(status)}
          <span class="board-column-count">${clientsInColumn.length}</span>
        </div>
        <div class="board-cards"></div>
      `;

      const cardsWrap = column.querySelector(".board-cards");
      if (clientsInColumn.length === 0) {
        cardsWrap.innerHTML = '<div class="board-empty">No clients</div>';
      } else {
        clientsInColumn.forEach((c) => {
          const card = document.createElement("div");
          card.className = "board-card";
          card.draggable = true;
          card.dataset.clientId = c.id;
          card.innerHTML = `
            <div class="board-card-name">${escapeHtml(c.fullName || "")}</div>
            <div class="board-card-meta">
              <span>${escapeHtml(c.lineOfBusiness || "—")}</span>
              <span>Renewal: ${fmtDate(c.renewalDate)}</span>
            </div>
          `;
          card.addEventListener("click", () => {
            window.location.hash = `#/clients/${c.id}`;
          });
          card.addEventListener("dragstart", (e) => {
            card.classList.add("dragging");
            e.dataTransfer.setData("text/plain", c.id);
            e.dataTransfer.effectAllowed = "move";
          });
          card.addEventListener("dragend", () => card.classList.remove("dragging"));
          cardsWrap.appendChild(card);
        });
      }

      column.addEventListener("dragover", (e) => {
        e.preventDefault();
        column.classList.add("drag-over");
      });
      column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
      column.addEventListener("drop", async (e) => {
        e.preventDefault();
        column.classList.remove("drag-over");
        const clientId = e.dataTransfer.getData("text/plain");
        const client = clients.find((c) => c.id === clientId);
        if (!client || client.status === status) return;
        client.status = status;
        await updateClient(clientId, { status });
        redraw();
      });

      board.appendChild(column);
    });
  }

  function redraw() {
    const filtered = getFiltered();
    updateClearButtonVisibility();
    if (viewMode === "board") {
      tableWrap.classList.add("hidden");
      boardWrap.classList.remove("hidden");
      drawBoard(filtered);
    } else {
      boardWrap.classList.add("hidden");
      tableWrap.classList.remove("hidden");
      drawTable(filtered);
    }
  }

  document.getElementById("client-search").addEventListener("input", redraw);
  statusFilter.addEventListener("change", redraw);
  carrierFilter.addEventListener("input", redraw);
  lobFilter.addEventListener("change", redraw);
  renewalFromFilter.addEventListener("change", redraw);
  renewalToFilter.addEventListener("change", redraw);
  clearFiltersBtn.addEventListener("click", () => {
    statusFilter.value = "";
    carrierFilter.value = "";
    lobFilter.value = "";
    renewalFromFilter.value = "";
    renewalToFilter.value = "";
    redraw();
  });

  document.querySelectorAll("#clients-table th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (sortState.key === key) {
        sortState.dir *= -1;
      } else {
        sortState.key = key;
        sortState.dir = 1;
      }
      updateSortIndicators();
      redraw();
    });
  });

  document.querySelectorAll("#clients-view-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      viewMode = btn.dataset.view;
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
      document.querySelectorAll("#clients-view-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
      redraw();
    });
  });
  document.querySelectorAll("#clients-view-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === viewMode);
  });

  updateSortIndicators();
  redraw();
}
