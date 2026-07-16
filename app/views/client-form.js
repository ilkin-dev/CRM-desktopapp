// ============================================================
// Add/Edit client form: household basics, personal details, license,
// mailing/property address, and (edit mode only) household members.
// ============================================================
import {
  STATUSES, getClient, createClient, updateClient, deleteClient,
  listHouseholdMembers, createHouseholdMember, deleteHouseholdMember,
} from "../db.js";
import {
  toast, attachPhoneFormatter, buildLobCheckboxes, getLobCheckboxValues, LOB_OPTIONS, escapeHtml, fmtDate,
} from "../utils.js";
import { icon, hydrateIcons } from "../icons.js";

const SIMPLE_TEXT_FIELDS = [
  "secondaryPhone", "occupation", "employer", "preferredContactTime", "language",
  "driversLicenseNumber", "licenseProvince", "licenseClass",
  "mailingAddress", "mailingCity", "mailingProvince", "mailingPostalCode",
  "propertyAddress", "propertyCity", "propertyProvince", "propertyPostalCode",
];
const DATE_FIELDS = ["dateOfBirth", "licenseExpiry"];
const SELECT_FIELDS = ["maritalStatus", "preferredContactMethod"];

export async function renderClientForm(content, clientId) {
  content.innerHTML = "";
  content.appendChild(document.getElementById("tpl-client-form").content.cloneNode(true));
  hydrateIcons(content);

  const statusSelect = document.getElementById("f-status");
  STATUSES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusSelect.appendChild(opt);
  });

  const phoneInput = document.getElementById("f-phone");
  const secondaryPhoneInput = document.getElementById("f-secondaryPhone");
  attachPhoneFormatter(phoneInput);
  attachPhoneFormatter(secondaryPhoneInput);

  const lobGroup = document.getElementById("f-lob-group");
  const lobOtherInput = document.getElementById("f-lob-other");
  function syncLobOtherVisibility() {
    const checked = getLobCheckboxValues(lobGroup);
    lobOtherInput.classList.toggle("hidden", !checked.includes("Other"));
  }

  const sameAsMailingCheckbox = document.getElementById("f-propertyAddressSameAsMailing");
  const propertyAddressGrid = document.getElementById("f-property-address-grid");
  function syncPropertyAddressVisibility() {
    propertyAddressGrid.classList.toggle("hidden", sameAsMailingCheckbox.checked);
  }
  sameAsMailingCheckbox.addEventListener("change", syncPropertyAddressVisibility);

  let existing = null;
  let existingLob = [];
  if (clientId) {
    existing = await getClient(clientId);
    document.getElementById("client-form-title").textContent = "Edit Client";
    document.getElementById("f-fullName").value = existing.fullName || "";
    document.getElementById("f-status").value = existing.status || "New Lead";
    phoneInput.value = existing.phone || "";
    document.getElementById("f-email").value = existing.email || "";
    document.getElementById("f-carrier").value = existing.carrier || "";
    document.getElementById("f-renewalDate").value = existing.renewalDate || "";
    document.getElementById("f-referralSource").value = existing.referralSource || "";
    document.getElementById("f-notes").value = existing.notes || "";

    SIMPLE_TEXT_FIELDS.forEach((key) => {
      const el = document.getElementById(`f-${key}`);
      if (el) el.value = existing[key] || "";
    });
    DATE_FIELDS.forEach((key) => {
      document.getElementById(`f-${key}`).value = existing[key] || "";
    });
    SELECT_FIELDS.forEach((key) => {
      document.getElementById(`f-${key}`).value = existing[key] || "";
    });
    if (existing.yearsLicensed !== null && existing.yearsLicensed !== undefined) {
      document.getElementById("f-yearsLicensed").value = existing.yearsLicensed;
    }
    sameAsMailingCheckbox.checked = existing.propertyAddressSameAsMailing !== 0 && existing.propertyAddressSameAsMailing !== false;
    syncPropertyAddressVisibility();
    if (secondaryPhoneInput.value) attachPhoneFormatter(secondaryPhoneInput);

    // Parse stored comma-separated LOB string back into checkboxes,
    // treating any value not in the known list as "Other" free text.
    const stored = (existing.lineOfBusiness || "").split(",").map((s) => s.trim()).filter(Boolean);
    const known = stored.filter((v) => LOB_OPTIONS.includes(v));
    const unknown = stored.filter((v) => !LOB_OPTIONS.includes(v));
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

    document.getElementById("f-household-members-section").classList.remove("hidden");
    await renderHouseholdMembers(clientId);
    document.getElementById("hm-add-btn").addEventListener("click", async () => {
      const fullName = document.getElementById("hm-fullName").value.trim();
      if (!fullName) return;
      await createHouseholdMember({
        clientId,
        fullName,
        relationship: document.getElementById("hm-relationship").value,
        dateOfBirth: document.getElementById("hm-dateOfBirth").value || null,
      });
      document.getElementById("hm-fullName").value = "";
      document.getElementById("hm-dateOfBirth").value = "";
      await renderHouseholdMembers(clientId);
    });
  } else {
    statusSelect.value = "New Lead";
    syncPropertyAddressVisibility();
  }

  buildLobCheckboxes(lobGroup, existingLob);
  syncLobOtherVisibility();
  lobGroup.addEventListener("change", syncLobOtherVisibility);

  document.getElementById("client-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkedLob = getLobCheckboxValues(lobGroup);
    const lobValues = checkedLob.filter((v) => v !== "Other");
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
      propertyAddressSameAsMailing: sameAsMailingCheckbox.checked,
    };
    SIMPLE_TEXT_FIELDS.forEach((key) => {
      data[key] = document.getElementById(`f-${key}`).value.trim();
    });
    DATE_FIELDS.forEach((key) => {
      data[key] = document.getElementById(`f-${key}`).value || null;
    });
    SELECT_FIELDS.forEach((key) => {
      data[key] = document.getElementById(`f-${key}`).value;
    });
    const yearsLicensedVal = document.getElementById("f-yearsLicensed").value;
    data.yearsLicensed = yearsLicensedVal ? Number(yearsLicensedVal) : null;

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

async function renderHouseholdMembers(clientId) {
  const listEl = document.getElementById("household-members-list");
  const members = await listHouseholdMembers(clientId);
  if (members.length === 0) {
    listEl.innerHTML = '<div class="empty-note">No household members added yet.</div>';
    return;
  }
  listEl.innerHTML = "";
  members.forEach((m) => {
    const row = document.createElement("div");
    row.className = "mini-list-row";
    row.innerHTML = `
      <span class="mini-list-title">${escapeHtml(m.fullName)}</span>
      <span class="mini-list-sub">${escapeHtml(m.relationship || "")}${m.dateOfBirth ? " — " + fmtDate(m.dateOfBirth) : ""}</span>
      <button type="button" class="mini-list-delete">${icon("trash", { className: "icon-sm" })}</button>
    `;
    row.querySelector(".mini-list-delete").addEventListener("click", async () => {
      await deleteHouseholdMember(m.id);
      await renderHouseholdMembers(clientId);
    });
    listEl.appendChild(row);
  });
}
