// ============================================================
// Client detail — Drivers tab: add/list/delete drivers, with nested
// driving record entries (violations/claims).
// ============================================================
import {
  DRIVER_RELATIONSHIPS, DRIVING_RECORD_TYPES,
  listDriversForClient, createDriver, deleteDriver,
  listDrivingRecordEntries, addDrivingRecordEntry,
} from "../../db.js";
import { escapeHtml, fmtDate, toast } from "../../utils.js";
import { icon } from "../../icons.js";

function fillSelect(selectEl, options, blankLabel) {
  selectEl.innerHTML = "";
  if (blankLabel) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = blankLabel;
    selectEl.appendChild(blank);
  }
  options.forEach((opt) => {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    selectEl.appendChild(el);
  });
}

export async function renderDriversTab(panel, clientId) {
  panel.innerHTML = "";
  panel.appendChild(document.getElementById("tpl-tab-drivers").content.cloneNode(true));

  fillSelect(document.getElementById("d-relationship"), DRIVER_RELATIONSHIPS);

  document.getElementById("driver-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("d-fullName").value.trim();
    if (!fullName) return;
    const yearsLicensedVal = document.getElementById("d-yearsLicensed").value;
    await createDriver({
      clientId,
      fullName,
      relationship: document.getElementById("d-relationship").value,
      dateOfBirth: document.getElementById("d-dateOfBirth").value || null,
      licenseNumber: document.getElementById("d-licenseNumber").value.trim(),
      licenseProvince: document.getElementById("d-licenseProvince").value.trim(),
      licenseExpiry: document.getElementById("d-licenseExpiry").value || null,
      licenseClass: document.getElementById("d-licenseClass").value.trim(),
      yearsLicensed: yearsLicensedVal ? Number(yearsLicensedVal) : null,
    });
    toast("Driver added.", "success");
    document.getElementById("driver-form").reset();
    await renderDriversList(clientId);
  });

  await renderDriversList(clientId);
}

async function renderDriversList(clientId) {
  const listEl = document.getElementById("drivers-list");
  const drivers = await listDriversForClient(clientId);
  if (drivers.length === 0) {
    listEl.innerHTML = '<div class="empty-note">No drivers added yet.</div>';
    return;
  }
  listEl.innerHTML = "";
  for (const driver of drivers) {
    const card = document.createElement("section");
    card.className = "card policy-card";
    card.innerHTML = `
      <div class="policy-card-header">
        <h3>${icon("license", { className: "icon" })} ${escapeHtml(driver.fullName)}</h3>
        <span class="badge">${escapeHtml(driver.relationship || "—")}</span>
      </div>
      <dl class="info-list policy-info-list">
        <dt>Date of Birth</dt><dd>${fmtDate(driver.dateOfBirth)}</dd>
        <dt>License #</dt><dd>${escapeHtml(driver.licenseNumber || "—")}</dd>
        <dt>License Province</dt><dd>${escapeHtml(driver.licenseProvince || "—")}</dd>
        <dt>License Expiry</dt><dd>${fmtDate(driver.licenseExpiry)}</dd>
        <dt>License Class</dt><dd>${escapeHtml(driver.licenseClass || "—")}</dd>
        <dt>Years Licensed</dt><dd>${driver.yearsLicensed ?? "—"}</dd>
      </dl>
      <div class="policy-sub-section" id="driver-sub-${driver.id}"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-danger driver-delete-btn"><span class="icon-slot" data-icon="trash"></span> Delete Driver</button>
      </div>
    `;
    card.querySelectorAll("[data-icon]").forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, { className: el.className });
    });
    card.querySelector(".driver-delete-btn").addEventListener("click", async () => {
      if (!confirm(`Delete ${driver.fullName}? This also removes their driving record. This cannot be undone.`)) return;
      await deleteDriver(driver.id);
      toast("Driver deleted.", "success");
      await renderDriversList(clientId);
    });
    listEl.appendChild(card);

    await renderDrivingRecordSection(card.querySelector(`#driver-sub-${driver.id}`), driver.id);
  }
}

async function renderDrivingRecordSection(container, driverId) {
  container.innerHTML = `
    <h4 class="sub-section-title">${icon("attachment", { className: "icon-sm" })} Driving Record</h4>
    <div class="mini-list" id="record-list-${driverId}"></div>
    <div class="mini-add-row">
      <select class="dr-type"></select>
      <input type="date" class="dr-date" />
      <input type="text" class="dr-description" placeholder="Description" style="flex:1;min-width:160px;" />
      <input type="number" class="dr-amount" placeholder="Amount ($)" style="max-width:110px;" />
      <label class="checkbox-pill"><input type="checkbox" class="dr-atFault" /> <span>At-fault</span></label>
      <button type="button" class="btn btn-ghost btn-sm dr-add-btn"><span class="icon-slot" data-icon="plus"></span> Add</button>
    </div>
  `;
  fillSelect(container.querySelector(".dr-type"), DRIVING_RECORD_TYPES);
  container.querySelectorAll("[data-icon]").forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, { className: el.className });
  });

  async function refresh() {
    const listEl = container.querySelector(`#record-list-${driverId}`);
    const entries = await listDrivingRecordEntries(driverId);
    if (entries.length === 0) {
      listEl.innerHTML = '<div class="empty-note">No violations or claims on file.</div>';
      return;
    }
    listEl.innerHTML = "";
    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "mini-list-row";
      const faultTag = entry.type === "Claim" && entry.atFault !== null ? (entry.atFault ? " (at-fault)" : " (not at-fault)") : "";
      row.innerHTML = `
        <span class="mini-list-title">${escapeHtml(entry.type)}${faultTag}</span>
        <span class="mini-list-sub">${fmtDate(entry.date)} — ${escapeHtml(entry.description || "")}${entry.amount ? " — $" + Number(entry.amount).toLocaleString() : ""}</span>
      `;
      listEl.appendChild(row);
    });
  }

  container.querySelector(".dr-add-btn").addEventListener("click", async () => {
    const description = container.querySelector(".dr-description").value.trim();
    const date = container.querySelector(".dr-date").value;
    if (!description && !date) return;
    const type = container.querySelector(".dr-type").value;
    const amountVal = container.querySelector(".dr-amount").value;
    await addDrivingRecordEntry(driverId, {
      type,
      date: date || null,
      description,
      amount: amountVal ? Number(amountVal) : null,
      atFault: type === "Claim" ? container.querySelector(".dr-atFault").checked : null,
    });
    container.querySelector(".dr-description").value = "";
    container.querySelector(".dr-date").value = "";
    container.querySelector(".dr-amount").value = "";
    container.querySelector(".dr-atFault").checked = false;
    toast("Driving record entry added.", "success");
    await refresh();
  });

  await refresh();
}
