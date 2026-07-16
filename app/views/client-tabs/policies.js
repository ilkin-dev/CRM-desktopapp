// ============================================================
// Client detail — Policies tab: add/list/delete policies, with
// nested vehicle management (Auto policies) and property details
// (Home/Condo/Tenant policies).
// ============================================================
import {
  POLICY_TYPES, POLICY_STATUSES, PAYMENT_FREQUENCIES, COMMON_ENDORSEMENTS,
  VEHICLE_USAGE_OPTIONS,
  PROPERTY_TYPES, CONSTRUCTION_TYPES, ROOF_TYPES, HEATING_TYPES, ELECTRICAL_TYPES,
  PLUMBING_TYPES, FOUNDATION_TYPES, BASEMENT_TYPES, WATER_SOURCES, SEWER_TYPES,
  listPoliciesForClient, createPolicy, deletePolicy,
  listVehiclesForPolicy, createVehicle, deleteVehicle,
  getPropertyDetails, savePropertyDetails,
} from "../../db.js";
import {
  escapeHtml, fmtDate, toast, statusIcon, statusClass, attachCurrencyFormatter, currencyValue,
  buildCheckboxPills, getCheckedCheckboxValues,
} from "../../utils.js";
import { icon } from "../../icons.js";

const PROPERTY_TYPE_SET = new Set(["Home", "Condo", "Tenant"]);

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

export async function renderPoliciesTab(panel, clientId) {
  panel.innerHTML = "";
  panel.appendChild(document.getElementById("tpl-tab-policies").content.cloneNode(true));

  fillSelect(document.getElementById("p-type"), POLICY_TYPES, "— Select —");
  fillSelect(document.getElementById("p-status"), POLICY_STATUSES);
  fillSelect(document.getElementById("p-paymentFrequency"), PAYMENT_FREQUENCIES, "— Select —");
  attachCurrencyFormatter(document.getElementById("p-premium"));

  const endorsementsGroup = document.getElementById("p-endorsements-group");
  buildCheckboxPills(endorsementsGroup, COMMON_ENDORSEMENTS, [], (opt) => escapeHtml(opt));

  const typeSelect = document.getElementById("p-type");
  const autoDeductibles = document.getElementById("p-auto-deductibles");
  const homeDeductibles = document.getElementById("p-home-deductibles");
  typeSelect.addEventListener("change", () => {
    autoDeductibles.classList.toggle("hidden", typeSelect.value !== "Auto");
    homeDeductibles.classList.toggle("hidden", !PROPERTY_TYPE_SET.has(typeSelect.value));
  });

  document.getElementById("policy-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    if (!type) return;

    let deductibles = {};
    if (type === "Auto") {
      deductibles = {
        comprehensive: numOrNull("p-deductible-comprehensive"),
        collision: numOrNull("p-deductible-collision"),
      };
    } else if (PROPERTY_TYPE_SET.has(type)) {
      deductibles = {
        overall: numOrNull("p-deductible-overall"),
        water: numOrNull("p-deductible-water"),
      };
    }

    const additionalInsureds = document.getElementById("p-additionalInsureds").value
      .split("\n").map((s) => s.trim()).filter(Boolean);

    await createPolicy({
      clientId,
      type,
      carrier: document.getElementById("p-carrier").value.trim(),
      policyNumber: document.getElementById("p-policyNumber").value.trim(),
      status: document.getElementById("p-status").value,
      effectiveDate: document.getElementById("p-effectiveDate").value || null,
      renewalDate: document.getElementById("p-renewalDate").value || null,
      premium: currencyValue(document.getElementById("p-premium")),
      paymentFrequency: document.getElementById("p-paymentFrequency").value,
      priorCarrier: document.getElementById("p-priorCarrier").value.trim(),
      claimsFreeYears: numOrNull("p-claimsFreeYears"),
      liabilityLimit: document.getElementById("p-liabilityLimit").value.trim(),
      deductibles,
      endorsements: getCheckedCheckboxValues(endorsementsGroup),
      additionalInsureds,
      notes: document.getElementById("p-notes").value.trim(),
    });
    toast("Policy added.", "success");
    document.getElementById("policy-form").reset();
    autoDeductibles.classList.add("hidden");
    homeDeductibles.classList.add("hidden");
    await renderPoliciesList(clientId);
  });

  await renderPoliciesList(clientId);
}

function numOrNull(id) {
  const val = document.getElementById(id).value;
  return val === "" ? null : Number(val);
}

async function renderPoliciesList(clientId) {
  const listEl = document.getElementById("policies-list");
  const policies = await listPoliciesForClient(clientId);
  if (policies.length === 0) {
    listEl.innerHTML = '<div class="empty-note">No policies added yet.</div>';
    return;
  }
  listEl.innerHTML = "";
  for (const policy of policies) {
    const card = document.createElement("section");
    card.className = "card policy-card";
    card.innerHTML = `
      <div class="policy-card-header">
        <h3>${icon("bound", { className: "icon" })} ${escapeHtml(policy.type)} — ${escapeHtml(policy.carrier || "No carrier")}</h3>
        <span class="badge ${statusClass(policy.status)}">${statusIcon(policy.status)} ${escapeHtml(policy.status || "—")}</span>
      </div>
      <dl class="info-list policy-info-list">
        <dt>Policy #</dt><dd>${escapeHtml(policy.policyNumber || "—")}</dd>
        <dt>Effective</dt><dd>${fmtDate(policy.effectiveDate)}</dd>
        <dt>Renewal</dt><dd>${fmtDate(policy.renewalDate)}</dd>
        <dt>Premium</dt><dd>${policy.premium ? "$" + policy.premium.toLocaleString() : "—"}${policy.paymentFrequency ? " (" + escapeHtml(policy.paymentFrequency) + ")" : ""}</dd>
        <dt>Prior Carrier</dt><dd>${escapeHtml(policy.priorCarrier || "—")}</dd>
        <dt>Claims-Free Years</dt><dd>${policy.claimsFreeYears ?? "—"}</dd>
        <dt>Liability Limit</dt><dd>${escapeHtml(policy.liabilityLimit || "—")}</dd>
        <dt>Deductibles</dt><dd>${formatDeductibles(policy.deductibles)}</dd>
        <dt>Endorsements</dt><dd>${policy.endorsements.length ? escapeHtml(policy.endorsements.join(", ")) : "—"}</dd>
        <dt>Additional Insureds</dt><dd>${policy.additionalInsureds.length ? escapeHtml(policy.additionalInsureds.join(", ")) : "—"}</dd>
        <dt>Notes</dt><dd>${escapeHtml(policy.notes || "—")}</dd>
      </dl>
      <div class="policy-sub-section" id="policy-sub-${policy.id}"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-danger policy-delete-btn"><span class="icon-slot" data-icon="trash"></span> Delete Policy</button>
      </div>
    `;
    card.querySelectorAll("[data-icon]").forEach((el) => {
      el.outerHTML = icon(el.dataset.icon, { className: el.className });
    });
    card.querySelector(".policy-delete-btn").addEventListener("click", async () => {
      if (!confirm(`Delete this ${policy.type} policy? This also removes its vehicles/property details. This cannot be undone.`)) return;
      await deletePolicy(policy.id);
      toast("Policy deleted.", "success");
      await renderPoliciesList(clientId);
    });
    listEl.appendChild(card);

    const subSection = card.querySelector(`#policy-sub-${policy.id}`);
    if (policy.type === "Auto") {
      await renderVehiclesSection(subSection, policy.id);
    } else if (PROPERTY_TYPE_SET.has(policy.type)) {
      await renderPropertyDetailsSection(subSection, policy.id);
    }
  }
}

function formatDeductibles(deductibles) {
  const entries = Object.entries(deductibles || {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return "—";
  return escapeHtml(entries.map(([k, v]) => `${k}: $${Number(v).toLocaleString()}`).join(", "));
}

// ---------------- Vehicles (nested under an Auto policy) ----------------

async function renderVehiclesSection(container, policyId) {
  container.innerHTML = `
    <h4 class="sub-section-title">${icon("auto", { className: "icon-sm" })} Vehicles</h4>
    <div class="mini-list" id="vehicles-list-${policyId}"></div>
    <div class="mini-add-row">
      <input type="number" class="v-year" placeholder="Year" style="max-width:90px;" />
      <input type="text" class="v-make" placeholder="Make" style="max-width:120px;" />
      <input type="text" class="v-model" placeholder="Model" style="max-width:120px;" />
      <input type="text" class="v-vin" placeholder="VIN" style="max-width:180px;" />
      <select class="v-usage"></select>
      <button type="button" class="btn btn-ghost btn-sm v-add-btn"><span class="icon-slot" data-icon="plus"></span> Add Vehicle</button>
    </div>
  `;
  fillSelect(container.querySelector(".v-usage"), VEHICLE_USAGE_OPTIONS, "Usage");
  container.querySelectorAll("[data-icon]").forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, { className: el.className });
  });

  async function refresh() {
    const listEl = container.querySelector(`#vehicles-list-${policyId}`);
    const vehicles = await listVehiclesForPolicy(policyId);
    if (vehicles.length === 0) {
      listEl.innerHTML = '<div class="empty-note">No vehicles added yet.</div>';
      return;
    }
    listEl.innerHTML = "";
    vehicles.forEach((v) => {
      const row = document.createElement("div");
      row.className = "mini-list-row";
      row.innerHTML = `
        <span class="mini-list-title">${escapeHtml([v.year, v.make, v.model].filter(Boolean).join(" "))}</span>
        <span class="mini-list-sub">${escapeHtml(v.vin || "")}${v.usage ? " — " + escapeHtml(v.usage) : ""}</span>
        <button type="button" class="mini-list-delete">${icon("trash", { className: "icon-sm" })}</button>
      `;
      row.querySelector(".mini-list-delete").addEventListener("click", async () => {
        await deleteVehicle(v.id);
        await refresh();
      });
      listEl.appendChild(row);
    });
  }

  container.querySelector(".v-add-btn").addEventListener("click", async () => {
    const make = container.querySelector(".v-make").value.trim();
    const model = container.querySelector(".v-model").value.trim();
    if (!make && !model) return;
    const yearVal = container.querySelector(".v-year").value;
    await createVehicle({
      policyId,
      year: yearVal ? Number(yearVal) : null,
      make,
      model,
      vin: container.querySelector(".v-vin").value.trim(),
      usage: container.querySelector(".v-usage").value,
    });
    container.querySelector(".v-year").value = "";
    container.querySelector(".v-make").value = "";
    container.querySelector(".v-model").value = "";
    container.querySelector(".v-vin").value = "";
    toast("Vehicle added.", "success");
    await refresh();
  });

  await refresh();
}

// ---------------- Property details (nested under a Home/Condo/Tenant policy) ----------------

async function renderPropertyDetailsSection(container, policyId) {
  const existing = (await getPropertyDetails(policyId)) || {};
  container.innerHTML = `
    <h4 class="sub-section-title">${icon("home", { className: "icon-sm" })} Property Details</h4>
    <div class="form-grid">
      <div class="field"><label>Property Type</label><select class="pd-propertyType"></select></div>
      <div class="field"><label>Year Built</label><input type="number" class="pd-yearBuilt" /></div>
      <div class="field"><label>Square Footage</label><input type="number" class="pd-squareFootage" /></div>
      <div class="field"><label>Stories</label><input type="number" class="pd-stories" min="0" /></div>
      <div class="field"><label>Construction Type</label><select class="pd-constructionType"></select></div>
      <div class="field"><label>Roof Type</label><select class="pd-roofType"></select></div>
      <div class="field"><label>Roof Age (years)</label><input type="number" class="pd-roofAge" min="0" /></div>
      <div class="field"><label>Heating Type</label><select class="pd-heatingType"></select></div>
      <div class="field"><label>Electrical Type</label><select class="pd-electricalType"></select></div>
      <div class="field"><label>Electrical Amps</label><input type="number" class="pd-electricalAmps" /></div>
      <div class="field"><label>Plumbing Type</label><select class="pd-plumbingType"></select></div>
      <div class="field"><label>Foundation Type</label><select class="pd-foundationType"></select></div>
      <div class="field"><label>Basement</label><select class="pd-basementType"></select></div>
      <div class="field"><label>Bedrooms</label><input type="number" class="pd-bedrooms" min="0" /></div>
      <div class="field"><label>Bathrooms</label><input type="number" class="pd-bathrooms" min="0" /></div>
      <div class="field"><label>Water Source</label><select class="pd-waterSource"></select></div>
      <div class="field"><label>Sewer Type</label><select class="pd-sewerType"></select></div>
      <div class="field"><label>Distance to Fire Hydrant (km)</label><input type="number" step="0.1" class="pd-distanceToFireHydrantKm" /></div>
      <div class="field"><label>Distance to Fire Hall (km)</label><input type="number" step="0.1" class="pd-distanceToFireHallKm" /></div>
      <div class="field"><label>Mortgage Lienholder</label><input type="text" class="pd-mortgageLienholder" /></div>
      <div class="field"><label>Replacement Cost Estimate ($)</label><input type="text" inputmode="decimal" class="pd-replacementCostEstimate" /></div>
    </div>
    <div class="checkbox-group" style="margin-bottom:14px;">
      <label class="checkbox-pill"><input type="checkbox" class="pd-hasPool" /> <span>Pool</span></label>
      <label class="checkbox-pill"><input type="checkbox" class="pd-hasTrampoline" /> <span>Trampoline</span></label>
      <label class="checkbox-pill"><input type="checkbox" class="pd-hasPets" /> <span>Pets</span></label>
      <label class="checkbox-pill"><input type="checkbox" class="pd-securitySystem" /> <span>Security System</span></label>
      <label class="checkbox-pill"><input type="checkbox" class="pd-sumpPump" /> <span>Sump Pump</span></label>
      <label class="checkbox-pill"><input type="checkbox" class="pd-backwaterValve" /> <span>Backwater Valve</span></label>
    </div>
    <div class="field">
      <label>Prior Water Damage Claims</label>
      <textarea class="pd-priorWaterDamageClaims" rows="2"></textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-primary pd-save-btn"><span class="icon-slot" data-icon="save"></span> Save Property Details</button>
    </div>
  `;

  fillSelect(container.querySelector(".pd-propertyType"), PROPERTY_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-constructionType"), CONSTRUCTION_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-roofType"), ROOF_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-heatingType"), HEATING_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-electricalType"), ELECTRICAL_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-plumbingType"), PLUMBING_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-foundationType"), FOUNDATION_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-basementType"), BASEMENT_TYPES, "— Select —");
  fillSelect(container.querySelector(".pd-waterSource"), WATER_SOURCES, "— Select —");
  fillSelect(container.querySelector(".pd-sewerType"), SEWER_TYPES, "— Select —");
  container.querySelectorAll("[data-icon]").forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, { className: el.className });
  });

  const textFields = [
    "propertyType", "constructionType", "roofType", "heatingType", "electricalType",
    "plumbingType", "foundationType", "basementType", "waterSource", "sewerType",
    "mortgageLienholder", "priorWaterDamageClaims",
  ];
  const numberFields = [
    "yearBuilt", "squareFootage", "stories", "roofAge", "electricalAmps",
    "bedrooms", "bathrooms", "distanceToFireHydrantKm", "distanceToFireHallKm",
  ];
  const flagFields = ["hasPool", "hasTrampoline", "hasPets", "securitySystem", "sumpPump", "backwaterValve"];

  textFields.forEach((key) => {
    const el = container.querySelector(`.pd-${key}`);
    if (el && existing[key]) el.value = existing[key];
  });
  numberFields.forEach((key) => {
    const el = container.querySelector(`.pd-${key}`);
    if (el && existing[key] !== null && existing[key] !== undefined) el.value = existing[key];
  });
  flagFields.forEach((key) => {
    const el = container.querySelector(`.pd-${key}`);
    if (el) el.checked = !!existing[key];
  });
  const replacementCostInput = container.querySelector(".pd-replacementCostEstimate");
  attachCurrencyFormatter(replacementCostInput);
  if (existing.replacementCostEstimate) replacementCostInput.value = existing.replacementCostEstimate;

  container.querySelector(".pd-save-btn").addEventListener("click", async () => {
    const data = {};
    textFields.forEach((key) => {
      data[key] = container.querySelector(`.pd-${key}`).value.trim();
    });
    numberFields.forEach((key) => {
      const val = container.querySelector(`.pd-${key}`).value;
      data[key] = val === "" ? null : Number(val);
    });
    flagFields.forEach((key) => {
      data[key] = container.querySelector(`.pd-${key}`).checked;
    });
    data.replacementCostEstimate = currencyValue(replacementCostInput);
    await savePropertyDetails(policyId, data);
    toast("Property details saved.", "success");
  });
}
