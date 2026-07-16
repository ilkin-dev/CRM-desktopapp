// ============================================================
// Client detail view: tab shell (Overview / Policies / Drivers /
// Documents / Timeline). Each tab's rendering logic lives in its own
// module under client-tabs/ — this file just owns the header, tab
// nav, and which tab is active.
// ============================================================
import { getClient } from "../db.js";
import { escapeHtml, statusClass, statusIcon } from "../utils.js";
import { hydrateIcons } from "../icons.js";
import { renderOverviewTab } from "./client-tabs/overview.js";
import { renderPoliciesTab } from "./client-tabs/policies.js";
import { renderDriversTab } from "./client-tabs/drivers.js";
import { renderDocumentsTab } from "./client-tabs/documents.js";
import { renderTimelineTab } from "./client-tabs/timeline.js";

const TAB_RENDERERS = {
  overview: (panel, client) => renderOverviewTab(panel, client),
  policies: (panel, client) => renderPoliciesTab(panel, client.id),
  drivers: (panel, client) => renderDriversTab(panel, client.id),
  documents: (panel, client) => renderDocumentsTab(panel, client.id),
  timeline: (panel, client, refreshHeader) => renderTimelineTab(panel, client.id, refreshHeader),
};

export async function renderClientDetail(content, clientId) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-client-detail").content.cloneNode(true));
  hydrateIcons(content);

  let client = await getClient(clientId);
  if (!client) {
    content.innerHTML = '<div class="card">Client not found. <a href="#/clients">Back to clients</a></div>';
    return;
  }

  function refreshHeader() {
    getClient(clientId).then((c) => {
      client = c;
      renderHeader();
    });
  }

  function renderHeader() {
    document.getElementById("detail-name").textContent = client.fullName;
    const statusEl = document.getElementById("detail-status");
    statusEl.innerHTML = `${statusIcon(client.status)} ${escapeHtml(client.status || "")}`;
    statusEl.className = "badge " + statusClass(client.status);
    document.getElementById("edit-client-link").href = `#/clients/${clientId}/edit`;
  }
  renderHeader();

  const panel = document.getElementById("client-tab-panel");
  let activeTab = "overview";

  function showTab(tab) {
    activeTab = tab;
    document.querySelectorAll("#client-tab-nav .tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    TAB_RENDERERS[tab](panel, client, refreshHeader);
  }

  document.querySelectorAll("#client-tab-nav .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });

  showTab(activeTab);
}
