// ============================================================
// Commissions view: bound-policy summary + table.
// ============================================================
import { listAllInteractions, listClients } from "../db.js";
import { fmtDate, todayStr, escapeHtml } from "../utils.js";
import { hydrateIcons } from "../icons.js";

export async function renderCommissions(content) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-commissions").content.cloneNode(true));
  hydrateIcons(content);

  const [interactions, clients] = await Promise.all([listAllInteractions(), listClients()]);
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const binds = interactions
    .filter((i) => i.type === "Bind")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalCommission = binds.reduce((sum, i) => sum + (i.commissionAmount || 0), 0);
  const totalPremium = binds.reduce((sum, i) => sum + (i.premiumAmount || 0), 0);
  const thisMonth = todayStr().slice(0, 7);
  const monthCommission = binds
    .filter((i) => (i.date || "").slice(0, 7) === thisMonth)
    .reduce((sum, i) => sum + (i.commissionAmount || 0), 0);

  document.getElementById("comm-stats").innerHTML = `
    <div class="stat"><div class="num">${binds.length}</div><div class="label">Policies Bound</div></div>
    <div class="stat"><div class="num">$${totalPremium.toLocaleString()}</div><div class="label">Total Premium</div></div>
    <div class="stat"><div class="num">$${totalCommission.toLocaleString()}</div><div class="label">Total Commission</div></div>
    <div class="stat"><div class="num">$${monthCommission.toLocaleString()}</div><div class="label">This Month</div></div>
  `;

  const tbody = document.getElementById("comm-tbody");
  tbody.innerHTML = "";
  if (binds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-note">No bound policies logged yet.</td></tr>';
  } else {
    binds.forEach((i) => {
      const c = clientsById[i.clientId];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="date-col">${fmtDate(i.date)}</td>
        <td>${c ? `<a href="#/clients/${i.clientId}">${escapeHtml(c.fullName)}</a>` : "—"}</td>
        <td>${escapeHtml(i.quoteLOB || "—")}</td>
        <td class="num">${i.premiumAmount ? "$" + i.premiumAmount.toLocaleString() : "—"}</td>
        <td class="num">${i.commissionRate ? i.commissionRate + "%" : "—"}</td>
        <td class="num">${i.commissionAmount ? "$" + i.commissionAmount.toLocaleString() : "—"}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}
